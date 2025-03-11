// ===========================================================================
// SERVER - MAIN ENTRY POINT FOR FADEX25 BACKEND
// ===========================================================================

import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import sqlite3 from 'sqlite3';
import { fetchAndStoreLatestOHLCV, initialFetchWithGapFill } from './api/PerpKlineApi';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// Initialize SQLite for cron job
const db = new sqlite3.Database('./market_data.db');

// Daily cron job to delete data older than 4 months (runs at 2 AM UTC)
cron.schedule('0 2 * * *', () => {
  console.log('Running daily cleanup of old data...');
  const fourMonthsAgo = Date.now() - 120 * 24 * 60 * 60 * 1000;
  db.run('DELETE FROM ohlcv WHERE timestamp < ?', [fourMonthsAgo], (err) => {
    if (err) {
      console.error('Error deleting old data:', err.message);
    } else {
      console.log(`Deleted data older than 4 months (before ${new Date(fourMonthsAgo).toISOString()})`);
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Initial fetch with gap filling on startup
  initialFetchWithGapFill().catch(console.error);
  // Continuous polling is handled in PerpKlineApi.ts
});