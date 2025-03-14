// ===========================================================================
// TimeUtils.ts - Timestamp Calculations
// ===========================================================================
// Provides utility functions to calculate timestamps for data range management,
// supporting the 4-month rolling database and gap-filling logic.
// ===========================================================================

// ------------------------------------------
// Helper: Calculate 4 Months Ago Timestamp (10 digits, seconds)
// ------------------------------------------
// @returns {number} Unix timestamp in seconds, representing the start of a
//                   4-month period ago (approx. 122 days for precision).
export const calculateFourMonthsAgo = (): number => {
  const now = Math.floor(Date.now() / 1000);
  return now - (122 * 24 * 60 * 60); // 122 days (approx. 4 months) in seconds
};

// ------------------------------------------
// Helper: Calculate 1 Minute Ago Timestamp (10 digits, seconds)
// ------------------------------------------
// @returns {number} Unix timestamp in seconds, representing 1 minute ago.
export const calculateOneMinuteAgo = (): number => {
  const now = Math.floor(Date.now() / 1000);
  return now - 60;
};