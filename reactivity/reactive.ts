import { isObject, toRawType } from '../shared';
import { mutableHandlers, readonlyHandlers, shallowReactiveHandlers, shallowReadonlyHandlers } from './baseHandlers';
import { mutableCollectionHandlers } from './collectionHandlers';

export const reactiveMap = new WeakMap<Target, any>();
export const shallowReactiveMap = new WeakMap<Target, any>();
export const readonlyMap = new WeakMap<Target, any>();
export const shallowReadonlyMap = new WeakMap<Target, any>();

const enum TargetType {
  INVALID = 0,
  COMMON = 1,
  COLLECTION = 2
}

export const enum ReactiveFlags {
  SKIP = '__v_skip',
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
  IS_SHALLOW = '__v_isShallow',
  RAW = '__v_raw'
}

export interface Target {
  [ReactiveFlags.SKIP]?: boolean;
  [ReactiveFlags.IS_REACTIVE]?: boolean;
  [ReactiveFlags.IS_READONLY]?: boolean;
  [ReactiveFlags.IS_SHALLOW]?: boolean;
  [ReactiveFlags.RAW]?: any;
}

function targetTypeMap(rawType: string) {
  switch (rawType) {
    case 'Object':
    case 'Array':
      return TargetType.COMMON;
    case 'Map':
    case 'Set':
    case 'WeakMap':
    case 'WeakSet':
      return TargetType.COLLECTION;
    default:
      return TargetType.INVALID;
  }
}

function getTargetType(value: object) {
  return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
    ? TargetType.INVALID
    : targetTypeMap(toRawType(value));
}

export function reactive<T extends object>(obj: T): T {
  return createReactive(obj, false, mutableHandlers, mutableCollectionHandlers, reactiveMap);
}

export function shallowReactive<T extends object>(obj: T): T {
  return createReactive(obj, false, shallowReactiveHandlers, {}, shallowReactiveMap);
}

export function readonly<T extends object>(obj: T): T {
  return createReactive(obj, true, readonlyHandlers, {}, readonlyMap);
}

export function shallowReadonly<T extends object>(obj: T): T {
  return createReactive(obj, true, shallowReadonlyHandlers, {}, shallowReadonlyMap);
}

function createReactive<T extends object>(target: Target, isReadonly = false, baseHandlers: ProxyHandler<any>,
                                          collectionHandlers: ProxyHandler<any>,
                                          proxyMap: WeakMap<Target, any>) {
  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }
  const targetType = getTargetType(target);
  // 此处通过skip标记使target不proxy化
  // TODO 仍然不明白为什么需要限制objectExtensibleState
  if (targetType === TargetType.INVALID) {
    return target;
  }
  const proxy = new Proxy(
    target,
    targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
  );
  proxyMap.set(target, proxy);
  return proxy;
}

export const toReactive = <T extends unknown>(value: T): T =>
  isObject(value) ? reactive(value) : value;

export const toReadonly = <T extends unknown>(value: T): T =>
  isObject(value) ? readonly(value as Record<any, any>) : value;
