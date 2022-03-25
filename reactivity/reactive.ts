import { mutableHandlers, readonlyHandlers, shallowReactiveHandlers, shallowReadonlyHandlers } from './baseHandlers';

export const reactiveMap = new WeakMap<object, any>();
export const shallowReactiveMap = new WeakMap<object, any>();
export const readonlyMap = new WeakMap<object, any>();
export const shallowReadonlyMap = new WeakMap<object, any>();

const enum TargetType {
  INVALID = 0,
  COMMON = 1,
  COLLECTION = 2
}

export function reactive<T extends object>(obj: T): T {
  return createReactive(obj, false, mutableHandlers, {}, reactiveMap);
}

export function shallowReactive<T extends object>(obj: T): T {
  return createReactive(obj, false, shallowReactiveHandlers, {}, shallowReactiveMap);
}

export function readonly<T extends object>(obj: T): T {
  return createReactive(obj, true, readonlyHandlers, {}, readonlyMap);
}

export function shallowReadOnly<T extends object>(obj: T): T {
  return createReactive(obj, true, shallowReadonlyHandlers, {}, shallowReadonlyMap);
}

function createReactive<T extends object>(obj: T, isReadonly = false, baseHandlers: ProxyHandler<any>,
                                          collectionHandlers: ProxyHandler<any>,
                                          proxyMap: WeakMap<object, any>): T {
  if (proxyMap.has(obj)) {
    return proxyMap.get(obj) as T;
  }
  const result: any = new Proxy(obj, baseHandlers);
  proxyMap.set(obj, result);
  return result;
}
