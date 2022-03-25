import { builtInSymbols, isSymbol } from '../shared';
import { arrayInstrumentations } from './baseHandlers';
import { ITERATOR_KEY, shouldTrack, track, trigger } from './index';
import { TRIGGER_TYPE } from './operations';

const reactiveMap = new WeakMap<object, object>();

export function reactive<T extends object>(obj: T): T {
  if (reactiveMap.has(obj)) {
    return reactiveMap.get(obj) as T;
  }
  return createReactive(obj);
}

export function shallowReactive<T extends object>(obj: T): T {
  return createReactive(obj, true);
}

export function readonly<T extends object>(obj: T): T {
  return createReactive(obj, false, true);
}

export function shallowReadOnly<T extends object>(obj: T): T {
  return createReactive(obj, true, true);
}

function createReactive<T extends object>(obj: T, isShallow = false, isReadonly = false): T {
  const result = new Proxy(obj, {
    get(target, key: string, receiver) {
      if (key === '__raw') {
        return target;
      }
      if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
        return Reflect.get(arrayInstrumentations, key, receiver);
      }
      if (!isReadonly && shouldTrack && (isSymbol(key) ? builtInSymbols.has(key) :/* TODO private key filter */ true)) {
        track(target, key);
      }
      const res = Reflect.get(target, key, receiver);
      if (isShallow) {
        return res;
      }
      if (typeof res === 'object' && res != null) {
        return isReadonly ? readonly(res) : reactive(res);
      }
      return res;
    },
    set(target, key: string, newVal: any, receiver) {
      if (isReadonly) {
        return true;
      }
      const oldVal = target[key];
      const type = Array.isArray(target)
        ? (target.length <= +key ? TRIGGER_TYPE.ADD : TRIGGER_TYPE.SET)
        : (Object.prototype.hasOwnProperty.call(target, key) ? TRIGGER_TYPE.SET : TRIGGER_TYPE.ADD);
      Reflect.set(target, key, newVal, receiver);
      if (receiver.__raw === target) {
        if (oldVal !== newVal && !Number.isNaN(oldVal) && !Number.isNaN(newVal)) {
          trigger(target, key, type, newVal);
        }
      }
      return true;
    },
    has(target: T, key: string | symbol) {
      track(target, key);
      return Reflect.has(target, key);
    },
    ownKeys(target: T): ArrayLike<string | symbol> {
      track(target, Array.isArray(target) ? 'length' : ITERATOR_KEY);
      return Reflect.ownKeys(target);
    },
    deleteProperty(target: T, key: string | symbol): boolean {
      const has = Object.prototype.hasOwnProperty.call(target, key);
      const hasDelete = Reflect.deleteProperty(target, key);

      if (has && hasDelete) {
        trigger(target, key, TRIGGER_TYPE.DELETE, null);
      }
      return hasDelete;
    }
  });
  reactiveMap.set(obj, result);
  return result;
}
