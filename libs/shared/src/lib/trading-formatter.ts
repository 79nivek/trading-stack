export interface ExchangeFilter {
  filterType: string;
  tickSize?: string;
  stepSize?: string;
  minQty?: string;
  maxQty?: string;
  minPrice?: string;
  maxPrice?: string;
  [key: string]: any;
}

export interface SymbolExchangeInfo {
  pricePrecision: number;
  quantityPrecision: number;
  symbol: string;
  filters: ExchangeFilter[];
}

export class TradingFormatter {
  tickSize: number;
  stepSize: number;
  pricePrecision: number;
  qtyPrecision: number;
  minMove: number;

  constructor(exchangeInfo: SymbolExchangeInfo) {
    this.pricePrecision = exchangeInfo.pricePrecision;
    this.qtyPrecision = exchangeInfo.quantityPrecision;

    const priceFilter = exchangeInfo.filters.find(
      (f) => f.filterType === 'PRICE_FILTER',
    );
    const lotSizeFilter = exchangeInfo.filters.find(
      (f) => f.filterType === 'LOT_SIZE',
    );

    this.tickSize = parseFloat(priceFilter?.tickSize || '0');
    this.stepSize = parseFloat(lotSizeFilter?.stepSize || '0');

    // Calculate actual display precision based on tickSize instead of raw Binance pricePrecision.
    // E.g. tickSize 0.00001 -> precision 5. This prevents Lightweight Charts scaling bugs.
    if (this.tickSize > 0) {
      this.pricePrecision = Math.max(0, -Math.floor(Math.log10(this.tickSize)));
    }

    // Lightweight Charts requires minMove to be the exact float step size
    this.minMove = this.tickSize;
  }

  static formatPrice(rawPrice: number, options: TradingFormatter): number {
    const step =
      typeof options.tickSize === 'string'
        ? parseFloat(options.tickSize)
        : options.tickSize;
    const precision =
      typeof options.pricePrecision === 'string'
        ? parseInt(options.pricePrecision)
        : options.pricePrecision;
    const roundedPrice = Math.round(rawPrice / step) * step;
    return parseFloat(roundedPrice.toFixed(precision));
  }

  static formatQuantity(rawQty: number, options: TradingFormatter): number {
    const step =
      typeof options.stepSize === 'string'
        ? parseFloat(options.stepSize)
        : options.stepSize;
    const precision =
      typeof options.qtyPrecision === 'string'
        ? parseInt(options.qtyPrecision)
        : options.qtyPrecision;

    const roundedQty = Math.floor(rawQty / step) * step;
    return parseFloat(roundedQty.toFixed(precision));
  }
}
