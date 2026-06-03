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

function dateKeyToUtcMs(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function startOfDay(date) {
  const key = toDateKey(date);
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getDaysUntilExpiry(expiryDate) {
  const todayKey = toDateKey(new Date());
  const expiryKey = toDateKey(expiryDate);
  return Math.round((dateKeyToUtcMs(expiryKey) - dateKeyToUtcMs(todayKey)) / (1000 * 60 * 60 * 24));
}

function isExpiringWithinDays(expiryDate, days = 30) {
  const daysLeft = getDaysUntilExpiry(expiryDate);
  return daysLeft <= days;
}

function parseStoredDate(dateValue) {
  const key = toDateKey(dateValue);
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDisplayDate(dateValue) {
  const key = toDateKey(dateValue);
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString();
}

module.exports = {
  toDateKey,
  startOfDay,
  getDaysUntilExpiry,
  isExpiringWithinDays,
  parseStoredDate,
  formatDisplayDate,
};
