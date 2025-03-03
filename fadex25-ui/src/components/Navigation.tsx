// Fadex25/fadex25-ui/src/components/Navigation.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import logo from '../logo.png';
import styles from './Navigation.module.css';

export default function Navigation() {
  return (
    <nav className={styles.navBar}>
      <div className={styles.navContent}>
        <img src={logo} alt="Fadex25 Logo" className={styles.logo} />
        <div className={styles.navLinks}>
          <NavLink to="/livetrade" className={({ isActive }) => isActive ? styles.active : ''}>
            Live Trade
          </NavLink>
          <NavLink to="/backtester" className={({ isActive }) => isActive ? styles.active : ''}>
            Backtester
          </NavLink>
          <NavLink to="/marketdata" className={({ isActive }) => isActive ? styles.active : ''}>
            Market Data
          </NavLink>
        </div>
      </div>
    </nav>
  );
}