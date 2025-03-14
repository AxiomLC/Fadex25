// server.ts - Entry Point for OHLCV Data Fetching
// Manages the app lifecycle with minimal logging for DB updates and status.

import { fetchAndStoreOHLCV } from './api/BybitOhlcApi';
import { shutdown, getStatus, setStatus, getLatestTimestamp } from './api/DatabaseUtils';

let isRunning = false;
let successfullyLoadedSymbols: string[] = []; // Tracks symbols with loaded tables

// Start data process with minimal logging
const startDataProcess = async () => {
  if (isRunning) return;
  isRunning = true;

  try {
    setStatus('Running');
    const startTime = Date.now();
    await fetchAndStoreOHLCV('Running');
    const durationMs = Date.now() - startTime;

    // Check if DB is approximately full (within 5 minutes of present time)
    const oneMinuteAgo = Math.floor(Date.now() / 1000) - 60 * 5;
    const latestTimestamps = await Promise.all(successfullyLoadedSymbols.map(async (symbol) => {
      const latest = await getLatestTimestamp(symbol, '1m'); // Explicitly imported
      return { symbol, latest: latest || 0 };
    }));
    const isDbFull = latestTimestamps.every(({ latest }) => latest >= oneMinuteAgo);
    if (isDbFull) {
      console.log('Database is Full');
    }
    console.log('Server is Running');

    while (true) {
      await fetchAndStoreOHLCV('Running');
      await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// Execute process and handle shutdown
startDataProcess().catch(async (error) => {
  console.error('Error:', error);
  await shutdown();
  process.exit(1);
});

process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});

// Update successfully loaded symbols with logging
export const updateLoadedSymbols = (symbol: string) => {
  if (!successfullyLoadedSymbols.includes(symbol)) {
    successfullyLoadedSymbols.push(symbol);
    console.log(`Loaded symbol: ${symbol}`);
  }
};