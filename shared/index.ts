import { ReactiveFlags, Target } from '../reactivity';

export const isSymbol = (val: unknown): val is symbol => typeof val === 'symbol';
export const builtInSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    .map(key => (Symbol as any)[key])
    .filter(isSymbol)
);
export const objectToString = Object.prototype.toString;
export const toTypeString = (value: unknown): string =>
  objectToString.call(value);

export const toRawType = (value: unknown): string => {
  return toTypeString(value).slice(8, -1);
};

export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as Target)[ReactiveFlags.RAW];
  return raw ? toRaw(raw) : observed;
}

export function isReadonly(target: Target) {
  return !!(target && target[ReactiveFlags.IS_READONLY]);
}

export function isShallow(target: Target) {
  return !!(target && target[ReactiveFlags.IS_SHALLOW]);
}

export const isArray = Array.isArray;
const hasOwnProperty = Object.prototype.hasOwnProperty;
export const hasOwn = (
  val: object,
  key: string | symbol
): key is keyof typeof val => hasOwnProperty.call(val, key);
export const isMap = (val: unknown): val is Map<any, any> =>
  toTypeString(val) === '[object Map]'
export const isSet = (val: unknown): val is Set<any> =>
  toTypeString(val) === '[object Set]'

export const isDate = (val: unknown): val is Date => val instanceof Date
export const isFunction = (val: unknown): val is Function =>
  typeof val === 'function'
export const isString = (val: unknown): val is string => typeof val === 'string'
export const isObject = (val: unknown): val is Record<any, any> =>
  val !== null && typeof val === 'object'
export const isIntegerKey = (key: unknown) =>
  isString(key) &&
  key !== 'NaN' &&
  key[0] !== '-' &&
  '' + parseInt(key, 10) === key
