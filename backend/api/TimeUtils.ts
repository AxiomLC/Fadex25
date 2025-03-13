// /api/TimeUtils.ts

// ===========================================================================
// Time Utilities - Timestamp Calculations
// ===========================================================================

// ------------------------------------------
// Helper: Calculate 4 Months Ago Timestamp (10 digits, seconds)
// ------------------------------------------
export const calculateFourMonthsAgo = (): number => {
    const now = Math.floor(Date.now() / 1000);
    return now - (120 * 24 * 60 * 60); // 120 days (approx. 4 months) in seconds
  };
  
  // ------------------------------------------
  // Helper: Calculate 1 Minute Ago Timestamp (10 digits, seconds)
  // ------------------------------------------
  export const calculateOneMinuteAgo = (): number => {
    const now = Math.floor(Date.now() / 1000);
    return now - 60;
  };