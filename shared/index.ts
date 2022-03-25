export const isSymbol = (val: unknown): val is symbol => typeof val === 'symbol';
export const builtInSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    .map(key => (Symbol as any)[key])
    .filter(isSymbol)
);
