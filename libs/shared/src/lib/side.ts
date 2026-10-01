import { Direction, OppositeSide } from "@trading-stack/shared-dto";

export function directionToOppositeSide(direction: Direction): OppositeSide {
  return direction === Direction.LONG ? OppositeSide.SELL : OppositeSide.BUY;
}

export function oppositeSiteToDirection(site: OppositeSide): Direction {
  return site === OppositeSide.SELL ? Direction.LONG : Direction.SHORT;
}

export function amtToSide(amt: number | string): OppositeSide {
  const value = typeof amt === 'string' ? parseFloat(amt) : amt;
  return value > 0 ? OppositeSide.SELL : OppositeSide.BUY;
}

export function amtToDirection(amt: number | string): Direction {
  const value = typeof amt === 'string' ? parseFloat(amt) : amt;
  return value > 0 ? Direction.LONG : Direction.SHORT;
}
