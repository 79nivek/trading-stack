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
  }

  static formatPrice(
    rawPrice: number,
    {
      tickSize,
      pricePrecision,
    }: {
      tickSize: string | number;
      pricePrecision: string | number;
    },
  ): number {
    const step = typeof tickSize === 'string' ? parseFloat(tickSize) : tickSize;
    const precision =
      typeof pricePrecision === 'string'
        ? parseInt(pricePrecision)
        : pricePrecision;
    const roundedPrice = Math.round(rawPrice / step) * step;
    return parseFloat(roundedPrice.toFixed(precision));
  }

  static formatQuantity(
    rawQty: number,
    {
      stepSize,
      quantityPrecision,
    }: {
      stepSize: string | number;
      quantityPrecision: string | number;
    },
  ): number {
    const step = typeof stepSize === 'string' ? parseFloat(stepSize) : stepSize;
    const precision =
      typeof quantityPrecision === 'string'
        ? parseInt(quantityPrecision)
        : quantityPrecision;

    const roundedQty = Math.floor(rawQty / step) * step;
    return parseFloat(roundedQty.toFixed(precision));
  }
}
