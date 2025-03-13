// /api/PerpCcxtApi.ts

import ccxt from 'ccxt';
import { testPerpMarkets } from './TestPerpMarkets';
import { initializeDatabase, getEarliestTimestamp, getLatestTimestamp, storeOHLCV } from './DatabaseUtils';
import { calculateFourMonthsAgo, calculateOneMinuteAgo } from './TimeUtils';

type OHLCVCandle = [number, number | undefined, number | undefined, number | undefined, number | undefined, number | undefined];

const normalizeCandle = (candle: any[]): [number, number, number, number, number, number] | null => {
  if (!Array.isArray(candle) || candle.length !== 6) return null;
  const [timestamp, open, high, low, close, volume] = candle;
  if (
    typeof timestamp !== 'number' ||
    typeof open !== 'number' ||
    typeof high !== 'number' ||
    typeof low !== 'number' ||
    typeof close !== 'number' ||
    typeof volume !== 'number'
  ) return null;
  return [timestamp, open, high, low, close, volume];
};

const exchange = new ccxt.binanceusdm({ enableRateLimit: true });

const convertToBinanceSymbol = (symbol: string): string => {
  const cleanSymbol = symbol.replace(/^1000/, '');
  return `${cleanSymbol}/USDT:USDT`;
};

export const fetchAndStoreOHLCV = async (mode: 'Loading' | 'Running' = 'Loading') => {
  await initializeDatabase();

  const markets = testPerpMarkets;
  const fourMonthsAgo = calculateFourMonthsAgo();
  const oneMinuteAgo = calculateOneMinuteAgo();
  console.log(`Four Months Ago: ${fourMonthsAgo} (${new Date(fourMonthsAgo * 1000).toISOString()}), One Minute Ago: ${oneMinuteAgo} (${new Date(oneMinuteAgo * 1000).toISOString()})`);

  const timeframes = [{ timeframe: '1m' }, { timeframe: '5m' }, { timeframe: '15m' }, { timeframe: '1h' }];

  await exchange.loadMarkets();
  console.log('Available markets:', Object.keys(exchange.markets));

  // Process symbols in parallel
  await Promise.all(markets.map(async (symbol) => {
    const binanceSymbol = convertToBinanceSymbol(symbol);
    if (!(binanceSymbol in exchange.markets)) {
      console.log(`Symbol ${binanceSymbol} not available on Binance, skipping...`);
      return;
    }

    // Process timeframes sequentially for each symbol
    for (const timeframe of timeframes) {
      let earliestTimestamp = await getEarliestTimestamp(symbol, timeframe.timeframe);
      let latestTimestamp = await getLatestTimestamp(symbol, timeframe.timeframe);
      let startTime = earliestTimestamp === 0 ? fourMonthsAgo : Math.max(fourMonthsAgo, earliestTimestamp / 1000);
      if (latestTimestamp > 0) {
        const secondsPerCandle = timeframe.timeframe === '1m' ? 60 : timeframe.timeframe === '5m' ? 300 : timeframe.timeframe === '15m' ? 900 : 3600;
        startTime = Math.max(startTime, latestTimestamp / 1000 + secondsPerCandle);
      }
      console.log(`Starting fetch for ${symbol} (${binanceSymbol}) at ${timeframe.timeframe}, earliestTimestamp: ${earliestTimestamp} (${new Date(earliestTimestamp).toISOString()}), latestTimestamp: ${latestTimestamp} (${new Date(latestTimestamp).toISOString()}), startTime: ${startTime} (${new Date(startTime * 1000).toISOString()})`);

      let consecutiveNoDataCount = 0;
      const maxConsecutiveNoData = 5;
      const jumpInterval = 7 * 24 * 60 * 60;

      // Batch candles for database writes
      let candleBatch: [number, number, number, number, number, number][] = [];

      while (startTime < oneMinuteAgo) {
        const barsPerChunk = 1000;
        const secondsPerCandle = timeframe.timeframe === '1m' ? 60 : timeframe.timeframe === '5m' ? 300 : timeframe.timeframe === '15m' ? 900 : 3600;
        const chunkDuration = barsPerChunk * secondsPerCandle;
        const endTime = Math.min(startTime + chunkDuration, oneMinuteAgo);

        try {
          const rawOHLCV: Array<any[]> = await exchange.fetchOHLCV(binanceSymbol, timeframe.timeframe, startTime * 1000, barsPerChunk);
          console.log(`Fetched ${rawOHLCV.length} candles for ${binanceSymbol} at ${timeframe.timeframe}`);

          if (rawOHLCV.length === 0) {
            console.log(`No data for ${binanceSymbol} at ${timeframe.timeframe} from ${startTime} (${new Date(startTime * 1000).toISOString()}) to ${endTime} (${new Date(endTime * 1000).toISOString()}), moving to next chunk...`);
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

          consecutiveNoDataCount = 0;

          const ohlcv = rawOHLCV
            .map(normalizeCandle)
            .filter((candle): candle is [number, number, number, number, number, number] => candle !== null);

          if (ohlcv.length === 0) {
            console.log(`No valid candles after normalization for ${binanceSymbol} at ${timeframe.timeframe}, skipping...`);
            startTime = endTime;
            continue;
          }

          // Add to batch
          candleBatch.push(...ohlcv);

          // Write to database every 5000 candles or at the end
          if (candleBatch.length >= 5000) {
            storeOHLCV(symbol, timeframe.timeframe, candleBatch);
            console.log(`Stored ${candleBatch.length} candles for ${symbol} at ${timeframe.timeframe}`);
            candleBatch = [];
          }

          const lastCandle = ohlcv.length > 0 ? ohlcv[ohlcv.length - 1] : null;
          startTime = lastCandle ? Math.max(endTime, (lastCandle[0] / 1000) + secondsPerCandle) : endTime;

        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Error fetching OHLCV for ${binanceSymbol} at ${timeframe.timeframe}:`, errorMessage);
          startTime = endTime;
          continue;
        }

        // Adjusted delay for 40 requests/second
        if (mode === 'Running') {
          await new Promise(resolve => setTimeout(resolve, 200));
        } else {
          await new Promise(resolve => setTimeout(resolve, 25)); // 40 requests/second
        }
      }

      // Write any remaining candles in the batch
      if (candleBatch.length > 0) {
        storeOHLCV(symbol, timeframe.timeframe, candleBatch);
        console.log(`Stored ${candleBatch.length} candles for ${symbol} at ${timeframe.timeframe}`);
      }

      console.log(`Finished fetching ${symbol} at ${timeframe.timeframe}`);
    }
  }));

  console.log('Completed fetchAndStoreOHLCV process');
};