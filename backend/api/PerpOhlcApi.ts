// ===========================================================================
// API - FETCHES AND STORES OHLCV DATA FOR PERP MARKETS
// ===========================================================================

import sqlite3 from 'sqlite3';
import { testPerpMarkets } from './TestPerpMarkets'; // Placeholder: List of selected Perp markets

const db = new sqlite3.Database('./market_data.db');

// ------------------------------------------
// Script Section: Calculate 4 Months Ago Timestamp (10 digits, seconds)
// ------------------------------------------
const calculateFourMonthsAgo = (): number => {
  const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds
  return now - (120 * 24 * 60 * 60); // 120 days (approx. 4 months) in seconds
};

// ------------------------------------------
// Script Section: Calculate 1 Minute Ago Timestamp (10 digits, seconds)
// ------------------------------------------
const calculateOneMinuteAgo = (): number => {
  const now = Math.floor(Date.now() / 1000);
  return now - 60;
};

// ------------------------------------------
// Script Section: API Construct for 1m Resolution
// ------------------------------------------
const construct1mApi = (startTime: number, endTime: number, symbol: string): string => {
  return `https://api.orderly.org/v1/tv/history?from=${startTime}&to=${endTime}&resolution=1&symbol=${symbol}`;
};

// ------------------------------------------
// Script Section: API Construct for 5m Resolution
// ------------------------------------------
const construct5mApi = (startTime: number, endTime: number, symbol: string): string => {
  return `https://api.orderly.org/v1/tv/history?from=${startTime}&to=${endTime}&resolution=5&symbol=${symbol}`;
};

// ------------------------------------------
// Script Section: API Construct for 15m Resolution
// ------------------------------------------
const construct15mApi = (startTime: number, endTime: number, symbol: string): string => {
  return `https://api.orderly.org/v1/tv/history?from=${startTime}&to=${endTime}&resolution=15&symbol=${symbol}`;
};

// ------------------------------------------
// Script Section: API Construct for 60m Resolution
// ------------------------------------------
const construct60mApi = (startTime: number, endTime: number, symbol: string): string => {
  return `https://api.orderly.org/v1/tv/history?from=${startTime}&to=${endTime}&resolution=60&symbol=${symbol}`;
};

const initializeDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS ohlcv (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        volume REAL NOT NULL,
        UNIQUE(symbol, timeframe, timestamp)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating ohlcv table:', err.message);
        reject(err);
      } else {
        console.log('Table ohlcv created or already exists');
        resolve();
      }
    });
  });
};

const getEarliestTimestamp = (symbol: string, timeframe: string): Promise<number> => {
  return new Promise((resolve) => {
    db.get('SELECT MIN(timestamp) as earliest FROM ohlcv WHERE symbol = ? AND timeframe = ?', [symbol, timeframe], (err, row: any) => {
      if (err) {
        console.error(`Error fetching earliest timestamp for ${symbol} at ${timeframe}:`, err.message);
        resolve(0);
      } else {
        resolve(row.earliest || 0);
      }
    });
  });
};

const getLatestTimestamp = (symbol: string, timeframe: string): Promise<number> => {
  return new Promise((resolve) => {
    db.get('SELECT MAX(timestamp) as latest FROM ohlcv WHERE symbol = ? AND timeframe = ?', [symbol, timeframe], (err, row: any) => {
      if (err) {
        console.error(`Error fetching latest timestamp for ${symbol} at ${timeframe}:`, err.message);
        resolve(0);
      } else {
        resolve(row.latest || 0);
      }
    });
  });
};

// ------------------------------------------
// Script Section: Fetch and Store OHLCV Data (Loading and Running Modes)
// ------------------------------------------
export const fetchAndStoreOHLCV = async (mode: 'Loading' | 'Running' = 'Loading') => {
  await initializeDatabase();

  const markets = testPerpMarkets; // Placeholder: List of selected Perp markets
  const fourMonthsAgo = calculateFourMonthsAgo();
  const oneMinuteAgo = calculateOneMinuteAgo();
  console.log(`Four Months Ago: ${fourMonthsAgo} (${new Date(fourMonthsAgo * 1000).toISOString()}), One Minute Ago: ${oneMinuteAgo} (${new Date(oneMinuteAgo * 1000).toISOString()})`);

  const timeframes = [
    { timeframe: '1', api: construct1mApi },
    { timeframe: '5', api: construct5mApi },
    { timeframe: '15', api: construct15mApi },
    { timeframe: '60', api: construct60mApi },
  ];

  for (const symbol of markets) {
    for (const timeframe of timeframes) {
      let earliestTimestamp = await getEarliestTimestamp(symbol, timeframe.timeframe);
      let latestTimestamp = await getLatestTimestamp(symbol, timeframe.timeframe);
      let startTime = earliestTimestamp === 0 ? fourMonthsAgo : Math.max(fourMonthsAgo, earliestTimestamp / 1000);
      if (latestTimestamp > 0) {
        startTime = Math.max(startTime, latestTimestamp / 1000 + (timeframe.timeframe === '1' ? 60 : timeframe.timeframe === '5' ? 300 : timeframe.timeframe === '15' ? 900 : 3600));
      }
      console.log(`Starting fetch for ${symbol} at ${timeframe.timeframe}m, earliestTimestamp: ${earliestTimestamp} (${new Date(earliestTimestamp).toISOString()}), latestTimestamp: ${latestTimestamp} (${new Date(latestTimestamp).toISOString()}), startTime: ${startTime} (${new Date(startTime * 1000).toISOString()})`);

      let consecutiveNoDataCount = 0;
      const maxConsecutiveNoData = 5; // After 5 no_data responses, jump forward
      const jumpInterval = 7 * 24 * 60 * 60; // Jump forward 1 week (in seconds)

      while (startTime < oneMinuteAgo) {
        const barsPerChunk = 2000;
        const secondsPerCandle = timeframe.timeframe === '1' ? 60 : timeframe.timeframe === '5' ? 300 : timeframe.timeframe === '15' ? 900 : 3600;
        const chunkDuration = barsPerChunk * secondsPerCandle;
        let endTime = Math.min(startTime + chunkDuration, oneMinuteAgo);
        const url = timeframe.api(startTime, endTime, symbol);
        console.log(`Generated URL: ${url}`);

        try {
          const response = await fetch(url);
          console.log(`Response status: ${response.status}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          console.log(`Response data:`, data);
          if (data.s !== 'ok') {
            if (data.s === 'no_data') {
              console.log(`No data for ${symbol} at ${timeframe.timeframe}m from ${startTime} (${new Date(startTime * 1000).toISOString()}) to ${endTime} (${new Date(endTime * 1000).toISOString()}), moving to next chunk...`);
              consecutiveNoDataCount++;
              if (consecutiveNoDataCount >= maxConsecutiveNoData) {
                console.log(`Encountered ${consecutiveNoDataCount} consecutive no_data responses, jumping forward by 1 week...`);
                startTime += jumpInterval;
                consecutiveNoDataCount = 0;
              } else {
                startTime = endTime;
              }
              continue;
            }
            throw new Error(`API error: ${data.s}`);
          }

          consecutiveNoDataCount = 0; // Reset counter on successful data fetch

          const ohlcv = data.t.map((timestamp: number, index: number) => [
            timestamp * 1000,
            data.o[index],
            data.h[index],
            data.l[index],
            data.c[index],
            data.v[index],
          ]);

          if (ohlcv.length === 0) {
            console.log(`Empty data for ${symbol} at ${timeframe.timeframe}m, moving to next chunk...`);
            startTime = endTime;
            continue;
          }

          const stmtInsert = db.prepare(
            'INSERT OR IGNORE INTO ohlcv (symbol, timeframe, timestamp, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          );
          for (const candle of ohlcv) {
            stmtInsert.run([symbol, timeframe.timeframe, candle[0], candle[1], candle[2], candle[3], candle[4], candle[5]], (err: Error) => {
              if (err) console.error(`SQLite error for ${symbol} at ${timeframe.timeframe}:`, err.message);
            });
          }
          stmtInsert.finalize();
          console.log(`Stored ${ohlcv.length} candles for ${symbol} at ${timeframe.timeframe}m`);

          startTime = Math.max(endTime, (ohlcv[ohlcv.length - 1][0] / 1000) + secondsPerCandle);

        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Error fetching OHLCV for ${symbol} at ${timeframe.timeframe}m:`, errorMessage);
          startTime = endTime; // Skip to the next chunk on error
          continue;
        }

        // Rate limiting: Approx. 5 calls/second in Running mode
        if (mode === 'Running') {
          await new Promise(resolve => setTimeout(resolve, 200));
        } else {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
  }
};