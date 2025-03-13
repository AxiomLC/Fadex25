-- SQLite
SELECT 
    symbol,
    timeframe,
    MIN(timestamp) as min_timestamp,
    MAX(timestamp) as max_timestamp,
    DATETIME(MIN(timestamp) / 1000, 'unixepoch') as min_human_time,
    DATETIME(MAX(timestamp) / 1000, 'unixepoch') as max_human_time
FROM ohlcv
GROUP BY symbol, timeframe;