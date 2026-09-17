/**
 * Utility functions for formatting prices according to Binance Exchange logic.
 * Reference: https://binance-docs.github.io/apidocs/futures/en/#filters (PRICE_FILTER)
 */

/**
 * Calculates the decimal precision based on the Binance tickSize.
 * Example: '0.001' -> 3, '0.01' -> 2, '1' -> 0
 * 
 * @param tickSize The tickSize string or number from Binance exchangeInfo
 * @returns The number of decimal places for precision
 */
export function getPrecisionFromTickSize(tickSize: string | number): number {
  const step = typeof tickSize === 'string' ? parseFloat(tickSize) : tickSize;
  if (isNaN(step) || step <= 0) return 2; // Default to 2 decimal places

  return Math.max(0, -Math.floor(Math.log10(step)));
}

/**
 * Formats a currency value based on Binance's PRICE_FILTER rules.
 * According to Binance, (price - minPrice) % tickSize == 0.
 * To avoid JS floating point errors, we calculate precision from tickSize 
 * and use toFixed() after dividing by tickSize.
 * 
 * @param price The raw price to format
 * @param tickSize The tickSize (minMove) string or number
 * @returns Formatted price string that matches Binance's display
 */
export function formatBinancePrice(price: number | string, tickSize: string | number): string {
  const p = typeof price === 'string' ? parseFloat(price) : price;
  const step = typeof tickSize === 'string' ? parseFloat(tickSize) : tickSize;

  if (isNaN(p) || isNaN(step) || step <= 0) return p.toString();

  const precision = getPrecisionFromTickSize(step);
  
  // Align price to the nearest tick size to match Binance rules
  // Example: price=65000.1234, tickSize=0.01 -> 65000.12
  const roundedValue = Math.round(p / step) * step;

  return roundedValue.toFixed(precision);
}
