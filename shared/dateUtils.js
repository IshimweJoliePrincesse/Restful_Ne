// Converts any supported date value into a YYYY-MM-DD key for day-level comparisons.
function toDateKey(date) {
  if (!date) return '';

  if (typeof date === 'string') {
    const match = date.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }

  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Converts a date key into UTC milliseconds so day differences are stable.
function dateKeyToUtcMs(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

// Returns the local start of day for date filtering and comparisons.
function startOfDay(date) {
  const key = toDateKey(date);
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Calculates whole days remaining until an extinguisher expiry date.
function getDaysUntilExpiry(expiryDate) {
  const todayKey = toDateKey(new Date());
  const expiryKey = toDateKey(expiryDate);
  return Math.round((dateKeyToUtcMs(expiryKey) - dateKeyToUtcMs(todayKey)) / (1000 * 60 * 60 * 24));
}

// Determines whether an expiry date falls within the configured warning window.
function isExpiringWithinDays(expiryDate, days = 30) {
  const daysLeft = getDaysUntilExpiry(expiryDate);
  return daysLeft <= days;
}

// Parses a date-only value into a stored UTC date.
function parseStoredDate(dateValue) {
  const key = toDateKey(dateValue);
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// Parses a date-time value without stripping the selected time.
function parseStoredDateTime(dateValue) {
  return new Date(dateValue);
}

// Formats a stored date for display in API-generated responses.
function formatDisplayDate(dateValue) {
  const key = toDateKey(dateValue);
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString();
}

// Date utility module exports shared parsing, formatting, and expiry helpers.
module.exports = {
  toDateKey,
  startOfDay,
  getDaysUntilExpiry,
  isExpiringWithinDays,
  parseStoredDate,
  parseStoredDateTime,
  formatDisplayDate,
};
