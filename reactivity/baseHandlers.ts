import { builtInSymbols, isSymbol } from '../shared';
import {
  ITERATOR_KEY, pauseTracking, reactive, readonly, resetTracking, shouldTrack, track, trigger, TRIGGER_TYPE
} from './index';

interface ProxyHandler<T extends object> {
  apply?(target: T, thisArg: any, argArray: any[]): any;

  construct?(target: T, argArray: any[], newTarget: Function): object;

  defineProperty?(target: T, p: string | symbol, attributes: PropertyDescriptor): boolean;

  deleteProperty?(target: T, p: string | symbol): boolean;

  get?(target: T, p: string | symbol, receiver: any): any;

  getOwnPropertyDescriptor?(target: T, p: string | symbol): PropertyDescriptor | undefined;

  getPrototypeOf?(target: T): object | null;

  has?(target: T, p: string | symbol): boolean;

  isExtensible?(target: T): boolean;

  ownKeys?(target: T): ArrayLike<string | symbol>;

  preventExtensions?(target: T): boolean;

  set?(target: T, p: string | symbol, value: any, receiver: any): boolean;

  setPrototypeOf?(target: T, v: object | null): boolean;
}

export const arrayInstrumentations: Record<string, Function> = {};

['includes', 'indexOf', 'lastIndexOf'].forEach(method => {
  const original = Array.prototype[method];
  arrayInstrumentations[method] = function (...args: any[]) {
    let result = original.apply(this, args);
    if (result === false || result === -1) {
      result = original.apply(this.__raw, args);
    }
    return result;
  };
});
['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
  const original = Array.prototype[method];
  arrayInstrumentations[method] = function (...args: any[]) {
    pauseTracking();
    const result = original.apply(this, args);
    resetTracking();
    return result;
  };
});
const get = /*#__PURE__*/ createGetter();
const shallowGet = /*#__PURE__*/ createGetter(false, true);
const readonlyGet = /*#__PURE__*/ createGetter(true);
const shallowReadonlyGet = /*#__PURE__*/ createGetter(true, true);

function createGetter(isReadonly = false, isShallow = false) {
  return function (target: object, key: string, receiver) {
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
  };
}

const set = /*#__PURE__*/ createSetter();
const shallowSet = /*#__PURE__*/ createSetter(true);

function createSetter(isShallow = false) {
  return function (target: object, key: string, newVal: any, receiver) {
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
  };
}

function has(target: object, key: string | symbol) {
  track(target, key);
  return Reflect.has(target, key);
}

function ownKeys(target: object): ArrayLike<string | symbol> {
  track(target, Array.isArray(target) ? 'length' : ITERATOR_KEY);
  return Reflect.ownKeys(target);
}

function deleteProperty(target: object, key: string | symbol): boolean {
  const has = Object.prototype.hasOwnProperty.call(target, key);
  const hasDelete = Reflect.deleteProperty(target, key);

  if (has && hasDelete) {
    trigger(target, key, TRIGGER_TYPE.DELETE, null);
  }
  return hasDelete;
}

export const mutableHandlers: ProxyHandler<object> = {
  get,
  set,
  deleteProperty,
  has,
  ownKeys
};
export const readonlyHandlers: ProxyHandler<object> = {
  get: readonlyGet,
  set(target, key) {
    return true;
  },
  deleteProperty(target, key) {
    return true;
  }
};
export const shallowReactiveHandlers = /*#__PURE__*/ Object.assign(
  {},
  mutableHandlers,
  {
    get: shallowGet,
    set: shallowSet
  }
);

// Props handlers are special in the sense that it should not unwrap top-level
// refs (in order to allow refs to be explicitly passed down), but should
// retain the reactivity of the normal readonly object.
export const shallowReadonlyHandlers = /*#__PURE__*/ Object.assign(
  {},
  readonlyHandlers,
  {
    get: shallowReadonlyGet
  }
);
