// Fadex25/fadex25-ui/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import LiveTrade from './pages/LiveTrade';
import Backtester from './pages/Backtester';
import MarketData from './pages/MarketData';

import './App.css';

function App() {
  return (
    <Router>
      <div className="container">
        <Navigation />
        <Routes>
          <Route path="/marketdata" element={<MarketData />} />
          <Route path="/livetrade" element={<LiveTrade />} />
          <Route path="/backtester" element={<Backtester />} />
          <Route path="/" element={<LiveTrade />} /> {/* Default to LiveTrade */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;