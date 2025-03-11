// ===========================================================================
// PERP KLINE API - FETCHES AND STORES OHLCV DATA FOR WOOFI PRO PERP MARKETS
// ===========================================================================

import * as dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import { testPerpMarkets } from './TestPerpMarkets';

dotenv.config();

const db = new sqlite3.Database('./market_data.db');

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
  if (err) console.error('Error creating ohlcv table:', err.message);
});

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

const fetchAndStoreOHLCV = async (symbol: string, timeframe: { ccxt: string, tv: string }, since: number, to: number) => {
  try {
    const url = `https://api.orderly.org/v1/tv/history?symbol=${symbol}&resolution=${timeframe.tv}&from=${Math.floor(since / 1000)}&to=${Math.floor(to / 1000)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.s !== 'ok') {
      throw new Error(`API error: ${data.s}`);
    }

    const ohlcv = data.t.map((timestamp: number, index: number) => [
      timestamp * 1000,
      data.o[index],
      data.h[index],
      data.l[index],
      data.c[index],
      data.v[index],
    ]);

    const stmtInsert = db.prepare(
      'INSERT OR IGNORE INTO ohlcv (symbol, timeframe, timestamp, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const candle of ohlcv) {
      stmtInsert.run([symbol, timeframe.ccxt, candle[0], candle[1], candle[2], candle[3], candle[4], candle[5]], (err: Error) => {
        if (err) console.error(`SQLite error for ${symbol} at ${timeframe.ccxt}:`, err.message);
      });
    }
    stmtInsert.finalize();
    console.log(`Stored ${ohlcv.length} candles for ${symbol} at ${timeframe.ccxt}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching OHLCV for ${symbol} at ${timeframe.ccxt}:`, errorMessage);
  }
};

export const initialFetchWithGapFill = async () => {
  const markets = testPerpMarkets;
  const now = Date.now();
  const fourMonthsAgo = now - 120 * 24 * 60 * 60 * 1000;
  const timeframes = [
    { ccxt: '1m', tv: '1' },
    { ccxt: '5m', tv: '5' },
    { ccxt: '15m', tv: '15' },
    { ccxt: '60m', tv: '60' },
  ];

  for (const symbol of markets) {
    for (const timeframe of timeframes) {
      const latestTimestamp = await getLatestTimestamp(symbol, timeframe.ccxt);
      const startTime = latestTimestamp === 0 ? fourMonthsAgo : latestTimestamp;
      if (startTime < now) {
        console.log(`Filling gap for ${symbol} at ${timeframe.ccxt} from ${new Date(startTime).toISOString()} to ${new Date(now).toISOString()}`);
        const chunkSize = 2000 * 60 * 1000; // ~2000 minutes
        let currentTime = startTime;
        while (currentTime < now) {
          const nextTime = Math.min(currentTime + chunkSize, now);
          await fetchAndStoreOHLCV(symbol, timeframe, currentTime, nextTime);
          currentTime = nextTime;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }
};

export const fetchAndStoreLatestOHLCV = async () => {
  const markets = testPerpMarkets;
  const now = Date.now();
  const since = now - 15 * 60 * 1000; // 15 minutes
  const timeframes = [
    { ccxt: '1m', tv: '1' },
    { ccxt: '5m', tv: '5' },
    { ccxt: '15m', tv: '15' },
    { ccxt: '60m', tv: '60' },
  ];

  for (const symbol of markets) {
    for (const timeframe of timeframes) {
      await fetchAndStoreOHLCV(symbol, timeframe, since, now);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay
    }
  }
};

const pollingInterval = 12 * 1000; // 12 seconds
setInterval(fetchAndStoreLatestOHLCV, pollingInterval);