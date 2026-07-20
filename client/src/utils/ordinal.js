/**
 * Format a number as a localized ordinal string.
 * English: 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th"
 * Indonesian: 1 -> "ke-1", 2 -> "ke-2"
 */
export function formatOrdinal(n, locale = 'en') {
  if (n === undefined || n === null || Number.isNaN(n)) return '';
  const num = Number(n);
  if (num <= 0) return '';

  if (locale === 'id') {
    return `ke-${num}`;
  }

  const suffix = (() => {
    const lastDigit = num % 10;
    const lastTwoDigits = num % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return 'th';
    if (lastDigit === 1) return 'st';
    if (lastDigit === 2) return 'nd';
    if (lastDigit === 3) return 'rd';
    return 'th';
  })();

  return `${num}${suffix}`;
}
