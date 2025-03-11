-- SQLite
SELECT symbol, timeframe, 
       MIN(timestamp) as min_timestamp, 
       MAX(timestamp) as max_timestamp
FROM ohlcv
GROUP BY symbol, timeframe;
