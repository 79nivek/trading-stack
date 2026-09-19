export function directionToOppositeSide(direction: string): 'BUY' | 'SELL' {
  return direction === 'LONG' ? 'SELL' : 'BUY';
}
