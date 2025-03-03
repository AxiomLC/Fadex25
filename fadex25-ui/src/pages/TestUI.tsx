// Fadex25/fadex25-ui/src/pages/TestUI.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './TestUI.module.css';

export default function TestUI() {
  const [perpMarkets, setPerpMarkets] = useState<string[]>([]);
  const [indicators, setIndicators] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch Perp markets from Express server
    axios.get('http://localhost:4000/api/perp-markets')
      .then(response => {
        console.log('Perp markets response in TestUI:', response.data);
        setPerpMarkets(response.data);
      })
      .catch(err => {
        console.error('Error fetching Perp markets:', err);
        setError(`Error fetching Perp markets: ${err.message}`);
      });

    // Fetch indicators from Express server
    axios.get('http://localhost:4000/api/indicators')
      .then(response => {
        console.log('Indicators response in TestUI:', response.data);
        setIndicators(response.data);
      })
      .catch(err => {
        console.error('Error fetching indicators:', err);
        setError(`Error fetching indicators: ${err.message}`);
      });
  }, []);

  return (
    <div className={styles.container}>
      <h1>Test UI</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <h2>Perp Markets</h2>
      <ul>
        {perpMarkets.length > 0 ? (
          perpMarkets.map(market => (
            <li key={market}>{market}</li>
          ))
        ) : (
          <li>No Perp markets available</li>
        )}
      </ul>
      <h2>TradingView Indicators</h2>
      <ul>
        {indicators.map(indicator => (
          <li key={indicator}>{indicator}</li>
        ))}
      </ul>
      <p>Debug Info - Perp Markets Length: {perpMarkets.length}, Indicators Length: {indicators.length}</p>
    </div>
  );
}