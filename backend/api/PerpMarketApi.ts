// ===========================================================================
// PERP MARKET API - FETCHES AVAILABLE MARKETS FROM WOOFI PRO 
// - ORDERLY https://api.orderly.org/v1/public/info
// ===========================================================================

// ===========================================================================
// PERP MARKET API - FETCHES AVAILABLE MARKETS FROM WOOFI PRO
// ===========================================================================

import ccxt from 'ccxt';

// Initialize WOOFi Pro (public data only, no credentials needed for fetchMarkets)
const woofiPro = new ccxt.woofipro();

// Fetch all available WOOFi Pro markets
export const fetchMarkets = async (): Promise<any[]> => {
  try {
    const markets = await woofiPro.fetchMarkets();
    console.log('Available WOOFi Pro market symbols:', markets.map((market: any) => market.symbol));
    return markets;
  } catch (error) {
    console.error('Error fetching markets:', error);
    throw error;
  }
};