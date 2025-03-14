// server.ts - Entry Point for OHLCV Data Fetching
// Loading Mode: Rapid 4-month load, stops when 100% Full, logs periodically.
// Running Mode: Maintains real-time data with 1m bars <1m, slower intervals, quality checks.

import { fetchAndStoreOHLCV } from './api/BybitOhlcApi';
import { shutdown, getStatus, setStatus, getLatestTimestamp, initializeDatabase } from './api/DatabaseUtils';
import ccxt, { Exchange } from 'ccxt';

let isRunning = false;
let successfullyLoadedSymbols: string[] = [];
const exchange: Exchange = new ccxt.bybit({ enableRateLimit: true });

let lastLogTime = 0;

const checkDBFullness = async (threshold = 1.0) => {
  const oneMinuteAgo = Math.floor(Date.now() / 1000) - 60;
  const allTimestamps = await Promise.all(successfullyLoadedSymbols.flatMap(symbol =>
    ['1m', '5m', '15m', '1h'].map(async timeframe => ({
      symbol,
      timeframe,
      latest: await getLatestTimestamp(symbol, timeframe) || 0
    }))
  ));
  return allTimestamps.every(({ latest }) => latest >= oneMinuteAgo);
};

const startDataProcess = async () => {
  if (isRunning) return;
  isRunning = true;

  try {
    console.log('Entering Loading Mode: Initializing database and starting rapid data load...');
    setStatus('Loading');
    await initializeDatabase();

    const startTime = Date.now();
    await fetchAndStoreOHLCV('Loading', exchange);
    while (!(await checkDBFullness(1.0))) {
      const now = Date.now();
      if (now - lastLogTime >= 5000) { // Log every 5 seconds
        const latestFetch = await getLatestTimestamp(successfullyLoadedSymbols[0], '1m') || 0;
        console.log(`Loading progress: Latest timestamp ${latestFetch}, throttle errors sampled: [e.g., rate limit hit]`);
        lastLogTime = now;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    const durationMs = Date.now() - startTime;
    console.log(`Loading Mode completed in ${durationMs}ms, DB is 100% Full`);

    setStatus('Running');
    console.log('Entering Running Mode: Server is running, maintaining data continuously...');

    while (true) {
      await fetchAndStoreOHLCV('Running', exchange);
      await new Promise<void>(resolve => setTimeout(resolve, 30000));

      if (Date.now() % (5 * 60 * 1000) === 0) {
        const isDbCurrent = await checkDBFullness(1.0);
        console.log('Data quality check:', isDbCurrent ? 'Database is current' : 'Database may be lagging');
      }
    }
  } catch (error) {
    console.error('Error during data process:', error);
  }
};

startDataProcess().catch(async (error) => {
  console.error('Error during startup or runtime:', error);
  await shutdown();
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await shutdown();
  process.exit(0);
});

export const updateLoadedSymbols = (symbol: string) => {
  if (!successfullyLoadedSymbols.includes(symbol)) {
    successfullyLoadedSymbols.push(symbol);
    console.log(`Loaded symbol: ${symbol}`);
  }
};