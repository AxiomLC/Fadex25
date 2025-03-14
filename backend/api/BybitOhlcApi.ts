// BybitOhlcApi.ts - Fetch OHLCV Data from Bybit
// Fetches historical OHLCV data for a 4-month rolling database using Bybit's API via CCXT.
// Optimized for speed with parallel fetching.

import ccxt from 'ccxt';
import { testPerpMarkets } from './TestPerpMarkets';
import { calculateFourMonthsAgo, calculateOneMinuteAgo } from './TimeUtils';
import { initializeDatabase, storeOHLCV, getEarliestTimestamp, getLatestTimestamp } from './DatabaseUtils';
import { updateLoadedSymbols } from '../server'; // Adjusted path to /backend/server.ts

// Initialize Bybit exchange with rate limiting
const exchange = new ccxt.bybit({ enableRateLimit: true });

// Normalize raw candle data from Bybit
const normalizeCandle = (candle: any[]): [number, number, number, number, number, number] | null => {
  if (!Array.isArray(candle) || candle.length !== 6) return null;
  const [timestamp, open, high, low, close, volume] = candle.map(Number);
  if ([timestamp, open, high, low, close, volume].some(isNaN)) return null;
  return [timestamp, open, high, low, close, volume];
};

// Fetch and store OHLCV data for all markets
export const fetchAndStoreOHLCV = async (mode: 'Running' = 'Running') => {
  // Setup database and load Bybit markets
  await initializeDatabase();
  await exchange.loadMarkets();

  const markets = testPerpMarkets;
  const fourMonthsAgo = calculateFourMonthsAgo();
  const oneMinuteAgo = calculateOneMinuteAgo();
  const timeframes = [{ timeframe: '1m' }, { timeframe: '5m' }, { timeframe: '15m' }, { timeframe: '1h' }];

  // Split 4-month window into 1-month chunks for parallel fetching
  const oneMonthInSeconds = 30 * 24 * 60 * 60;
  const timeChunks: { start: number; end: number }[] = [];
  for (let start = fourMonthsAgo; start < oneMinuteAgo; start += oneMonthInSeconds) {
    timeChunks.push({ start, end: Math.min(start + oneMonthInSeconds, oneMinuteAgo) });
  }

  // Process all markets in parallel
  await Promise.all(markets.map(async (symbol) => {
    if (!(symbol in exchange.markets)) {
      console.log(`Symbol ${symbol} not available on Bybit, skipping...`);
      return;
    }

    // Process each timeframe for the symbol
    for (const timeframe of timeframes) {
      const earliest = await getEarliestTimestamp(symbol, timeframe.timeframe);
      const latest = await getLatestTimestamp(symbol, timeframe.timeframe);
      let startTime = earliest === 0 ? fourMonthsAgo : Math.max(fourMonthsAgo, earliest / 1000);
      if (latest > 0) {
        const secondsPerCandle = timeframe.timeframe === '1m' ? 60 : timeframe.timeframe === '5m' ? 300 : timeframe.timeframe === '15m' ? 900 : 3600;
        startTime = Math.max(startTime, latest / 1000 + secondsPerCandle);
      }

      let candleBatch: [number, number, number, number, number, number][] = [];

      // Fetch data in parallel for each 1-month chunk
      await Promise.all(timeChunks.map(async (chunk) => {
        if (chunk.end <= startTime || chunk.start >= oneMinuteAgo) return;

        const barsPerChunk = 1500;
        const secondsPerCandle = timeframe.timeframe === '1m' ? 60 : timeframe.timeframe === '5m' ? 300 : timeframe.timeframe === '15m' ? 900 : 3600;
        let chunkStart = Math.max(chunk.start, startTime);

        while (chunkStart < chunk.end) {
          const chunkEnd = Math.min(chunkStart + barsPerChunk * secondsPerCandle, chunk.end);
          try {
            const rawOHLCV = await exchange.fetchOHLCV(symbol, timeframe.timeframe, chunkStart * 1000, barsPerChunk, { category: 'linear' });
            const ohlcv = rawOHLCV
              .map(normalizeCandle)
              .filter((candle): candle is [number, number, number, number, number, number] => candle !== null);
            candleBatch.push(...ohlcv);

            if (candleBatch.length >= 10000) {
              storeOHLCV(symbol, timeframe.timeframe, candleBatch);
              updateLoadedSymbols(symbol);
              candleBatch = [];
            }

            const lastCandle = ohlcv.length > 0 ? ohlcv[ohlcv.length - 1] : null;
            chunkStart = lastCandle ? Math.max(chunkEnd, (lastCandle[0] / 1000) + secondsPerCandle) : chunkEnd;
          } catch (error) {
            console.error(`Error fetching for ${symbol} at ${timeframe.timeframe}:`, error);
            chunkStart = chunkEnd;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }));

      if (candleBatch.length > 0) {
        storeOHLCV(symbol, timeframe.timeframe, candleBatch);
        updateLoadedSymbols(symbol);
      }
    }
  }));
};