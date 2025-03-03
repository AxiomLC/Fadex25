// Fadex25/db/database.ts
import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';

export async function initializeDatabase() {
  return new Promise<Database>((resolve, reject) => {
    const db = new sqlite3.Database('./perp_data.db', (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

export async function purgeOldData(db: Database) {
  const threeMonthsAgo = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60);
  return new Promise<void>((resolve, reject) => {
    db.run('DELETE FROM perps_ohlc WHERE timestamp < ?', [threeMonthsAgo], (err) => {
      if (err) reject(err);
      else db.run('DELETE FROM perps_indicators WHERE timestamp < ?', [threeMonthsAgo], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}