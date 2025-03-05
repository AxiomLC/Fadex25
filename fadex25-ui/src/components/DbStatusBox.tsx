// Fadex25/fadex25-ui/src/components/DbStatusBox.tsx
import React, { useState, useEffect } from 'react';
import styles from './DbStatusBox.module.css'; // Ensure this CSS module exists

interface DbStatusProps {
  onError: (error: string) => void; // Callback for error logging/popup
}

const DbStatusBox: React.FC<DbStatusProps> = ({ onError }) => {
  const [dbStatus, setDbStatus] = useState<'Active' | 'Paused' | 'Error'>('Active');
  const [dbSize, setDbSize] = useState<string>('8.5gb');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const updateStatus = async () => {
      try {
        const status = await fetchDbStatus(); // Fetch from server (e.g., /api/db/status)
        setDbStatus(status.status);
        setDbSize(status.size);
      } catch (err: unknown) { // Use 'unknown' for catch variable
        const errorMsg = `Error fetching DB status: ${err instanceof Error ? err.message : String(err)}`;
        setError(errorMsg);
        onError(errorMsg); // Trigger popup or logging
        setDbStatus('Error');
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 3600000); // Update every hour
    return () => clearInterval(interval); // Cleanup
  }, [onError]);

  return (
    <div className={styles.statusBox}>
      {dbStatus === 'Active' && <span className={styles.status} style={{ color: 'green' }}>Active</span>}
      {dbStatus === 'Paused' && <span className={styles.status} style={{ color: 'yellow' }}>Paused</span>}
      {dbStatus === 'Error' && <span className={styles.status} style={{ color: 'red' }}>Error</span>}
      <span className={styles.size}> | Size: {dbSize}</span>
      {error && (
        <div className={styles.errorPopup}>
          <p>{error}</p>
          <button className="smallClearButton" onClick={() => setError(null)}>Close</button>
        </div>
      )}
    </div>
  );
};

export default DbStatusBox;