// DatabaseUtils.ts - SQLite Database Management
// Handles database operations for OHLCV data, including status tracking.

import Database from 'better-sqlite3';

const db = new Database('./market_data.db');
let currentStatus: 'Stopped' | 'Running' | 'Error' = 'Stopped';

// Get current server status
export const getStatus = (): { status: 'Stopped' | 'Running' | 'Error' } => {
  return { status: currentStatus };
};

// Set server status
export const setStatus = (status: 'Stopped' | 'Running' | 'Error'): void => {
  currentStatus = status;
};

// Initialize the OHLCV table in SQLite
export const initializeDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      db.exec(`
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
      `);
      resolve();
    } catch (err) {
      console.error('Error creating ohlcv table:', err);
      reject(err);
    }
  });
};

// Store OHLCV data in SQLite
export const storeOHLCV = (symbol: string, timeframe: string, ohlcv: [number, number, number, number, number, number][]): void => {
  const transaction = db.transaction(() => {
    const stmt = db.prepare(
      'INSERT OR IGNORE INTO ohlcv (symbol, timeframe, timestamp, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const candle of ohlcv) {
      stmt.run(symbol, timeframe, candle[0], candle[1], candle[2], candle[3], candle[4], candle[5]);
    }
  });
  transaction();
};

// Get earliest timestamp for a symbol and timeframe
export const getEarliestTimestamp = (symbol: string, timeframe: string): Promise<number> => {
  return new Promise((resolve) => {
    try {
      const stmt = db.prepare('SELECT MIN(timestamp) as earliest FROM ohlcv WHERE symbol = ? AND timeframe = ?');
      const row = stmt.get(symbol, timeframe) as { earliest: number | null };
      resolve(row?.earliest || 0);
    } catch (err) {
      console.error(`Error fetching earliest timestamp:`, err);
      resolve(0);
    }
  });
};

// Get latest timestamp for a symbol and timeframe
export const getLatestTimestamp = (symbol: string, timeframe: string): Promise<number> => {
  return new Promise((resolve) => {
    try {
      const stmt = db.prepare('SELECT MAX(timestamp) as latest FROM ohlcv WHERE symbol = ? AND timeframe = ?');
      const row = stmt.get(symbol, timeframe) as { latest: number | null };
      resolve(row?.latest || 0);
    } catch (err) {
      console.error(`Error fetching latest timestamp:`, err);
      resolve(0);
    }
  });
};

// Shut down the database connection
export const shutdown = (): Promise<void> => {
  return new Promise((resolve) => {
    db.close();
    resolve();
  });
};