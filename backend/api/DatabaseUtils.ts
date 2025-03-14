// DatabaseUtils.ts - SQLite Database Management
import Database from 'better-sqlite3';

const db = new Database('./market_data.db');
let currentStatus: 'Stopped' | 'Loading' | 'Running' | 'Error' = 'Stopped';

interface TimestampResult {
  earliest?: number;
  latest?: number;
}

export const getStatus = (): { status: 'Stopped' | 'Loading' | 'Running' | 'Error' } => {
  return { status: currentStatus };
};

export const setStatus = (status: 'Stopped' | 'Loading' | 'Running' | 'Error'): void => {
  currentStatus = status;
};

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
      db.exec('PRAGMA journal_mode=WAL;');
      db.exec('PRAGMA synchronous=NORMAL;');
      db.exec('PRAGMA temp_store=MEMORY;');
      resolve();
    } catch (err) {
      console.error('Error creating ohlcv table:', err);
      reject(err);
    }
  });
};

export const storeOHLCV = async (symbol: string, timeframe: string, ohlcv: [number, number, number, number, number, number][]): Promise<void> => {
  try {
    const stmt = db.prepare(
      'INSERT OR IGNORE INTO ohlcv (symbol, timeframe, timestamp, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const transaction = db.transaction(() => {
      for (const candle of ohlcv) {
        const [timestamp, open, high, low, close, volume] = candle;
        stmt.run(symbol, timeframe, timestamp, open, high, low, close, volume);
      }
    });
    transaction();
  } catch (err) {
    console.error('Error storing OHLCV in SQLite:', err);
    throw err;
  }
};

export const getLatestTimestamp = async (symbol: string, timeframe: string): Promise<number> => {
  try {
    const row = db.prepare('SELECT MAX(timestamp) as latest FROM ohlcv WHERE symbol = ? AND timeframe = ?').get(symbol, timeframe) as TimestampResult | undefined;
    return row && row.latest !== undefined ? row.latest : 0;
  } catch (err) {
    console.error(`Error fetching latest timestamp from SQLite:`, err);
    return 0;
  }
};

export const dumpToSQLite = async (): Promise<void> => {
  console.log('Data already stored in SQLite');
};

export const shutdown = (): Promise<void> => {
  return new Promise((resolve) => {
    db.close();
    resolve();
  });
};