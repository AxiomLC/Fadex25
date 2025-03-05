// Fadex25/api/getPerpMarkets.ts
interface OrderlyMarket {
  symbol: string;
}

interface OrderlyInfoResponse {
  data: {
    rows: OrderlyMarket[];
  };
}

export async function getPerpMarkets(): Promise<string[]> {
  let fetch;
  try {
    // Dynamically import node-fetch as ESM
    const nodeFetch = await import('node-fetch');
    fetch = nodeFetch.default;
  } catch (error) {
    console.error('Error importing node-fetch:', error);
    throw error;
  }

  try {
    const response = await fetch('https://api.orderly.org/v1/public/info');
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json() as OrderlyInfoResponse;
    console.log('Orderly API response:', data);

    const symbols = data.data.rows
      .map((market: OrderlyMarket) => market.symbol)
      .filter((symbol: string) => symbol.includes('PERP')); // Filter for Perp markets (e.g., PERP_ETH_USDC)

    console.log('Extracted Perp symbols:', symbols);
    return symbols.length > 0 ? symbols : [];
  } catch (error: any) {
    console.error('Error fetching Perp markets from Orderly API:', error.message);
    return [];
  }
}