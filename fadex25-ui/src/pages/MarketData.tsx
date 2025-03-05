import React, { useState, useEffect } from 'react';
import Dropdown from 'components/Dropdown'; // Updated path for Dropdown component
import { tvdefaultindicators } from 'data/TVDefaultIndicators'; // Updated path for TVDefaultIndicators
import styles from './MarketData.module.css';

interface OrderlyMarket {
  symbol: string;
}

interface OrderlyInfoResponse {
  data: {
    rows: OrderlyMarket[];
  };
}

export default function MarketData() {
  const [perpMarkets, setPerpMarkets] = useState<string[]>([]);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]); // Track selected Perp markets persistently
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]); // Track multiple selected indicators
  const [error, setError] = useState<string | null>(null); // Keep error state for potential use (e.g., Indicators or API)
  const [dbStatus, setDbStatus] = useState<string>('Active/Paused/Error'); // DB status for UI
  const [dbSize, setDbSize] = useState<string>('8.3gb'); // Placeholder DB size
  const [isApiOpen, setIsApiOpen] = useState(false); // Toggle for API popup

  useEffect(() => {
    // Fetch Perp markets from Orderly API using fetch, matching DropdownTest pattern
    fetch('https://api.orderly.org/v1/public/info')
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json() as Promise<OrderlyInfoResponse>;
      })
      .then(data => {
        console.log('Orderly API response in MarketData:', data);
        const symbols = data.data.rows
          .map((market: OrderlyMarket) => market.symbol)
          .filter((symbol: string) => symbol.includes('PERP')); // Filter for Perp markets (e.g., BTC-PERP, ETH-PERP, etc.)
        console.log('Extracted Perp symbols:', symbols);
        setPerpMarkets(symbols || []); // Store fetched Perp Markets
      })
      .catch(err => {
        console.error('Error fetching Perp markets:', err);
        setError(`Error fetching Perp markets: ${err.message}`);
      });
  }, []);

  const handleMarketSelect = (selected: string[]) => {
    setSelectedMarkets(selected);
  };

  const handleIndicatorSelect = (selected: string[]) => {
    setSelectedIndicators(selected);
  };

  const handleRestartDB = async () => {
    setDbStatus('Active');
    setDbSize('8.5gb');
    try {
      const selectedPerps = selectedMarkets.map(market => ({
        symbol: market,
        api: `https://api.orderly.org/v1/tv/history?symbol=${market.replace('PERP_', '')}_USDC&resolution=1m,5m,15m,1h&from=1709444608&to=1740980640`
      }));
      console.log('Storing selected Perp Markets in DB:', selectedPerps);
      await fetch('http://localhost:4000/api/db/ohlc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markets: selectedPerps, indicators: selectedIndicators })
      });
      console.log('DB restarted with new selections');
    } catch (err: unknown) {
      console.error('Error restarting DB:', err);
      setError(err instanceof Error ? `Error restarting DB: ${err.message}` : 'Error restarting DB: Unknown error');
      setDbStatus('Paused/Error');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerBox}>
        <h1 className={styles.title}>Market Data</h1>
        <h1 className={styles.subtitle}>3 Month Dynamic DB</h1>
        <div className={styles.controls}>
          <div className={styles.buttonGroup}>
            <button className={styles.orangeButton} onClick={() => setDbStatus('Paused/Error')}>PAUSE</button>
            <button className={styles.greenButton} onClick={handleRestartDB}>RESTART DB</button>
          </div>
          <div className={styles.statusBox}>
            <span className={styles.status}>DB Status: {dbStatus} | Size: {dbSize}</span>
          </div>
        </div>
      </div>
      <div className={styles.flexTable}>
        <div className={styles.flexRow}>
          <div className={`${styles.flexCell} ${styles.leftJustified}`}>
            <span className={styles.thTitle}>Perp Markets</span>
            <Dropdown
              label="Select a Perp Market"
              options={perpMarkets} // Use dynamic Perp Markets from API
              onSelectionChange={handleMarketSelect} // Handle multiple selections
            />
            {error && <p className={styles.error}>{error}</p>} {/* Display error if any */}
          </div>
          <div className={`${styles.flexCell} ${styles.centered}`}>
            <span className={styles.thTitle}>API: TV OHLC 1m 5m 15m 1h</span>
            <div className={styles.viewButtonWrapper}>
              <button className={styles.greyButton} onClick={() => setIsApiOpen(true)}>View</button>
            </div>
          </div>
          <div className={`${styles.flexCell} ${styles.rightJustified}`}>
            <span className={styles.thTitle}>Indicators</span>
            <Dropdown
              label="Select an Indicator"
              options={tvdefaultindicators} // Use static indicators from TVDefaultIndicators.ts
              onSelectionChange={handleIndicatorSelect} // Handle multiple selections
            />
          </div>
        </div>
      </div>
      <div className={styles.selectionsSpacer}></div>
      <p className={styles.selectionsLabel}>Selections - Selected Markets: {selectedMarkets.join(', ')}, Selected Indicators: {selectedIndicators.join(', ')}</p>
      {isApiOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsApiOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2>API URL</h2>
            <p className={styles.leftJustified}>https://api.orderly.org/v1/tv/history?symbol=PERP_XXXX_USDC&resolution=1m,5m,15m,1h&from=1709444608&to=1740980640</p>
            <button className={styles.closeButton} onClick={() => setIsApiOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}