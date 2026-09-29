import { Direction } from "@trading-stack/shared-dto";

export function directionToOppositeSide(direction: Direction): 'BUY' | 'SELL' {
  return direction === 'LONG' ? 'SELL' : 'BUY';
}
