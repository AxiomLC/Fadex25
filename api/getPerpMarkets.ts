// Fadex25/api/getPerpMarkets.ts
import axios from 'axios';

export async function getPerpMarkets(): Promise<string[]> {
  try {
    const response = await axios.get('https://api.orderly.org/v1/public/info');
    console.log('Orderly API response:', response.data); // Debug the full response
    const symbols = response.data.data.rows
      .map((market: { symbol: string }) => market.symbol)
      .filter((symbol: string) => symbol.startsWith('PERP_')); // Filter for Perp markets only
    console.log('Extracted Perp symbols:', symbols);
    return symbols || [];
  } catch (error: any) { // Explicitly type error as 'any' to resolve TS18046
    console.error('Error fetching Perp markets from Orderly API:', error.response?.data || error.message);
    return [];
  }
}