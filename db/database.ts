// Fadex25/db/database.ts
import * as sqlite3 from 'sqlite3'; // Correct import for TypeScript

const db = new sqlite3.Database('./market_data.db', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to market_data.db');
    // Create table if it doesn’t exist with 3-month rolling window
    db.run(`
      CREATE TABLE IF NOT EXISTS ohlc_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        market TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
});

export async function storeOhlcData(market: string, data: any) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO ohlc_data (market, data) VALUES (?, ?)', [market, JSON.stringify(data)], (err) => {
      if (err) {
        console.error('Error storing OHLC data:', err);
        reject(err);
      } else {
        console.log(`Stored OHLC data for ${market}`);
        resolve(true);
      }
    });
  });
}

// Purge data older than 3 months (rolling window)
export async function purgeOldData() {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const timestamp = threeMonthsAgo.toISOString().split('T')[0]; // YYYY-MM-DD format

  return new Promise((resolve, reject) => {
    db.run('DELETE FROM ohlc_data WHERE timestamp < ?', [timestamp], (err) => {
      if (err) {
        console.error('Error purging old data:', err);
        reject(err);
      } else {
        console.log('Purged data older than 3 months');
        resolve(true);
      }
    });
  });
}

export default db;