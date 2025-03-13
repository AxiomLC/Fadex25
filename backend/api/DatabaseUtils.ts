// /api/DatabaseUtils.ts

// ===========================================================================
// Database Utilities - SQLite Operations for OHLCV Data
// ===========================================================================

import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./market_data.db');

// ------------------------------------------
// Database: Initialize OHLCV Table
// ------------------------------------------
export const initializeDatabase = (): Promise<void> => {
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

// ------------------------------------------
// Database: Get Earliest Timestamp for a Symbol and Timeframe
// ------------------------------------------
export const getEarliestTimestamp = (symbol: string, timeframe: string): Promise<number> => {
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

// ------------------------------------------
// Database: Get Latest Timestamp for a Symbol and Timeframe
// ------------------------------------------
export const getLatestTimestamp = (symbol: string, timeframe: string): Promise<number> => {
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
// Database: Store OHLCV Data
// ------------------------------------------
export const storeOHLCV = (symbol: string, timeframe: string, ohlcv: [number, number, number, number, number, number][]): void => {
  const stmtInsert = db.prepare(
    'INSERT OR IGNORE INTO ohlcv (symbol, timeframe, timestamp, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const candle of ohlcv) {
    stmtInsert.run([symbol, timeframe, candle[0], candle[1], candle[2], candle[3], candle[4], candle[5]], (err: Error) => {
      if (err) console.error(`SQLite error for ${symbol} at ${timeframe}:`, err.message);
    });
  }
  stmtInsert.finalize();
};