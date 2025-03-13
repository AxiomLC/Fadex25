// server.ts

// ===========================================================================
// Server - Entry Point for Running OHLCV Data Fetch
// ===========================================================================

import { fetchAndStoreOHLCV } from './api/PerpCcxtApi';

console.log('Server running on http://localhost:4000');

// Start Fetching OHLCV Data in Loading Mode
fetchAndStoreOHLCV('Loading').then(() => {
  console.log('Initial data fetch completed');
}).catch((error) => {
  console.error('Error during initial data fetch:', error);
});