// BybitOhlcApi.ts - Fetch OHLCV Data from Bybit
// Loading Mode: Rapid 4-month fetch from latestTimestamp, all timeframes, logs every 5s.
// Running Mode: Maintains real-time data, ensures 1m bars <1m.

import ccxt, { Exchange } from 'ccxt';
import { testPerpMarkets } from './TestPerpMarkets';
import { calculateFourMonthsAgo, calculateOneMinuteAgo } from './TimeUtils';
import { initializeDatabase, storeOHLCV, getLatestTimestamp } from './DatabaseUtils';
import { updateLoadedSymbols } from '../server';

const normalizeCandle = (candle: any, symbol: string, timeframe: string): [number, number, number, number, number, number] | null => {
  if (!Array.isArray(candle) || candle.length !== 6) {
    console.warn(`Invalid candle format for ${symbol} at ${timeframe}:`, candle);
    return null;
  }
  const [timestamp, open, high, low, close, volume] = candle.map(Number);
  if ([timestamp, open, high, low, close, volume].some(isNaN) || timestamp <= 0) return null;
  return [timestamp, open, high, low, close, volume];
};

let lastFetchLogTime = 0;

export const fetchAndStoreOHLCV = async (mode: 'Loading' | 'Running', exchange: Exchange) => {
  await initializeDatabase();

  const markets = testPerpMarkets;
  markets.forEach(symbol => updateLoadedSymbols(symbol));

  const fourMonthsAgo = calculateFourMonthsAgo();
  const oneMinuteAgo = calculateOneMinuteAgo();
  const timeframes = ['1m', '5m', '15m', '1h'];

  await Promise.all(markets.map(async (symbol) => {
    await Promise.all(timeframes.map(async (timeframe) => {
      const latest = await getLatestTimestamp(symbol, timeframe);
      let startTime = latest === 0 ? fourMonthsAgo : Math.max(fourMonthsAgo, latest / 1000 + (timeframe === '1m' ? 60 : timeframe === '5m' ? 300 : timeframe === '15m' ? 900 : 3600));
      let candleBatch: [number, number, number, number, number, number][] = [];

      const oneMonthInSeconds = 30 * 24 * 60 * 60;
      const timeChunks: { start: number; end: number }[] = [];
      for (let start = startTime; start < oneMinuteAgo; start += oneMonthInSeconds) {
        timeChunks.push({ start, end: Math.min(start + oneMonthInSeconds, oneMinuteAgo) });
      }

      await Promise.all(timeChunks.map(async (chunk) => {
        if (chunk.end <= startTime || chunk.start >= oneMinuteAgo) return;

        const barsPerChunk = mode === 'Loading' ? 1500 : 500;
        const secondsPerCandle = timeframe === '1m' ? 60 : timeframe === '5m' ? 300 : timeframe === '15m' ? 900 : 3600;
        let chunkStart = Math.max(chunk.start, startTime);

        while (chunkStart < chunk.end) {
          const chunkEnd = Math.min(chunkStart + barsPerChunk * secondsPerCandle, chunk.end);
          try {
            const rawOHLCV = await exchange.fetchOHLCV(symbol, timeframe, chunkStart * 1000, barsPerChunk, { category: 'linear' });
            const now = Date.now();
            if (now - lastFetchLogTime >= 5000) { // Log every 5 seconds
              console.log(`Fetched ${rawOHLCV.length} bars for ${symbol} at ${timeframe} in ${mode} mode`);
              lastFetchLogTime = now;
            }
            const ohlcv = rawOHLCV
              .map((candle) => normalizeCandle(candle, symbol, timeframe))
              .filter((candle): candle is [number, number, number, number, number, number] => candle !== null);
            candleBatch.push(...ohlcv);

            if (candleBatch.length >= 10000) {
              storeOHLCV(symbol, timeframe, candleBatch);
              candleBatch = [];
            }

            const lastCandle = ohlcv.length > 0 ? ohlcv[ohlcv.length - 1] : null;
            chunkStart = lastCandle ? Math.max(chunkEnd, (lastCandle[0] / 1000) + secondsPerCandle) : chunkEnd;
          } catch (error) {
            if (error instanceof Error && error.message.includes('throttle queue is over maxCapacity')) {
              console.warn(`Throttle error for ${symbol} at ${timeframe}: Retrying in 1s`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              console.error(`Error fetching for ${symbol} at ${timeframe}:`, error);
              chunkStart = chunkEnd;
            }
          }
          await new Promise(resolve => setTimeout(resolve, mode === 'Loading' ? 10 : 50));
        }
      }));

      if (candleBatch.length > 0) {
        storeOHLCV(symbol, timeframe, candleBatch);
      }
    }));
  }));
};