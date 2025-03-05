import React, { useState, useEffect } from 'react';
import Dropdown from 'components/Dropdown';
import { tvdefaultindicators } from 'data/TVDefaultIndicators';
import styles from './MarketData.module.css';
import DbStatusBox from '../components/DbStatusBox';

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
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isApiOpen, setIsApiOpen] = useState(false); // Reintroduce isApiOpen state

  useEffect(() => {
    fetch('https://api.orderly.org/v1/public/info')
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json() as Promise<OrderlyInfoResponse>;
      })
      .then(data => {
        console.log('Orderly API response in MarketData:', data);
        const symbols = data.data.rows
          .map((market: OrderlyMarket) => market.symbol)
          .filter((symbol: string) => symbol.includes('PERP'));
        console.log('Extracted Perp symbols:', symbols);
        setPerpMarkets(symbols || []);
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
    // To be updated later
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerBox}>
        <h1 className={styles.title}>Market Data</h1>
        <h1 className={styles.subtitle}>3 Month Dynamic DB</h1>
        <div className={styles.controls}>
          <div className={styles.buttonGroup}>
            <button className="orangeButton" onClick={() => {/* Pause logic to be updated later */}}>PAUSE</button>
            <button className="greenButton" onClick={handleRestartDB}>RESTART DB</button>
          </div>
          <DbStatusBox onError={(err) => setError(err)} />
        </div>
      </div>
      <div className={styles.flexTable}>
        <div className={styles.flexRow}>
          <div className={`${styles.flexCell} ${styles.leftJustified}`}>
            <span className={styles.thTitle}>Perp Markets</span>
            <Dropdown
              label="Select a Perp Market"
              options={perpMarkets}
              onSelectionChange={handleMarketSelect}
            />
            {error && <p className={styles.error}>{error}</p>}
          </div>
          <div className={`${styles.flexCell} ${styles.centered}`}>
            <span className={styles.thTitle}>API: TV OHLC 1m 5m 15m 1h</span>
            <div className={styles.viewButtonWrapper}>
              <button className="greyButton" onClick={() => setIsApiOpen(true)}>View</button>
            </div>
          </div>
          <div className={`${styles.flexCell} ${styles.rightJustified}`}>
            <span className={styles.thTitle}>Indicators</span>
            <Dropdown
              label="Select an Indicator"
              options={tvdefaultindicators}
              onSelectionChange={handleIndicatorSelect}
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
            <button className="smallClearButton" onClick={() => setIsApiOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}