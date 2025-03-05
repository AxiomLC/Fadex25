import React, { useState, useEffect, useRef } from 'react';
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
  const [indicators, setIndicators] = useState<string[]>([]);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]); // Track multiple selected indicators
  const [error, setError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<string>('Acitve/Paused/Error'); // DB status for UI
  const [dbSize, setDbSize] = useState<string>('8.3gb'); // Placeholder DB size
  const [isOpenPerp, setIsOpenPerp] = useState(false); // Toggle for Perp dropdown
  const [isOpenIndicator, setIsOpenIndicator] = useState(false); // Toggle for Indicator dropdown
  const [isApiOpen, setIsApiOpen] = useState(false); // Toggle for API popup
  const perpRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch Perp markets from Orderly API using fetch
    fetch('https://api.orderly.org/v1/public/info')
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json() as Promise<OrderlyInfoResponse>;
      })
      .then(data => {
        console.log('Orderly API response in MarketData:', data);
        const symbols = data.data.rows
          .map((market: OrderlyMarket) => market.symbol)
          .filter((symbol: string) => symbol.includes('PERP')); // Filter for Perp markets (e.g., PERP_ETH_USDC)
        console.log('Extracted Perp symbols:', symbols);
        setPerpMarkets(symbols || []);
      })
      .catch(err => {
        console.error('Error fetching Perp markets:', err);
        setError(`Error fetching Perp markets: ${err.message}`);
      });

    // Fetch indicators from Express server using fetch
    fetch('http://localhost:4000/api/indicators')
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json() as Promise<string[]>;
      })
      .then(data => {
        console.log('Indicators response in MarketData:', data);
        setIndicators(data);
      })
      .catch(err => {
        console.error('Error fetching indicators:', err);
        setError(`Error fetching indicators: ${err.message}`);
      });

    // Close dropdowns on outside click, but allow "Select All" to function without closing
    const handleClickOutside = (event: MouseEvent) => {
      if (perpRef.current && !perpRef.current.contains(event.target as Node) && !(event.target as HTMLElement).closest('.selectAll')) {
        setIsOpenPerp(false);
      }
      if (indicatorRef.current && !indicatorRef.current.contains(event.target as Node)) {
        setIsOpenIndicator(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarketSelect = (market: string) => {
    setSelectedMarkets(prev =>
      prev.includes(market) ? prev.filter(m => m !== market) : [...prev, market]
    );
  };

  const handleSelectAllMarkets = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedMarkets(perpMarkets);
    } else {
      setSelectedMarkets([]);
    }
  };

  const handleIndicatorSelect = (indicator: string) => {
    setSelectedIndicators(prev =>
      prev.includes(indicator) ? prev.filter(i => i !== indicator) : [...prev, indicator]
    );
  };

  const handleRestartDB = async () => {
    setDbStatus('Active');
    setDbSize('8.5gb');
    try {
      const selectedPerps = selectedMarkets.map(market => ({
        symbol: market,
        api: `https://api.orderly.org/v1/tv/history?symbol=${market.replace('PERP_', '')}_USDC&resolution=1m,5m,15m,1h&from=1709444608&to=1740980640`
      }));
      console.log('Storing selected Perps in DB:', selectedPerps);
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
            <label className={styles.selectAllInline}>
              <input type="checkbox" checked={selectedMarkets.length === perpMarkets.length} onChange={handleSelectAllMarkets} />
              Select All
            </label>
            <div className={styles.dropdownContainer} ref={perpRef}>
              <button className={styles.dropdownButton} onClick={() => setIsOpenPerp(!isOpenPerp)}>
                Select a Perp Market
              </button>
              {isOpenPerp && (
                <div className={`${styles.dropdownContent} ${styles.dropdownDown}`} style={{ maxHeight: Math.max(300, perpMarkets.length * 20) + 'px' }}>
                  {perpMarkets.map(market => (
                    <label key={market} className={styles.dropdownItem}>
                      <input
                        type="checkbox"
                        checked={selectedMarkets.includes(market)}
                        onChange={() => handleMarketSelect(market)}
                      />
                      {market}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className={`${styles.flexCell} ${styles.centered}`}>
            <span className={styles.thTitle}>API: TV OHLC 1m 5m 15m 1h</span>
            <div className={styles.viewButtonWrapper}>
            <button className={styles.greyButton} onClick={() => setIsApiOpen(true)}>View</button>
            </div>
          </div>
          <div className={`${styles.flexCell} ${styles.rightJustified}`}>
            <span className={styles.thTitle}>Indicators</span>
            <div className={styles.dropdownContainer} ref={indicatorRef}>
              <button className={styles.dropdownButton} onClick={() => setIsOpenIndicator(!isOpenIndicator)}>
                Select an Indicator
              </button>
              {isOpenIndicator && (
                <div className={`${styles.dropdownContent} ${styles.dropdownDown}`} style={{ maxHeight: Math.max(300, indicators.length * 20) + 'px' }}>
                  {indicators.map(indicator => (
                    <label key={indicator} className={styles.dropdownItem}>
                      <input
                        type="checkbox"
                        checked={selectedIndicators.includes(indicator)}
                        onChange={() => handleIndicatorSelect(indicator)}
                      />
                      {indicator}
                    </label>
                  ))}
                </div>
              )}
            </div>
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