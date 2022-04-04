import { builtInSymbols, isArray, isReadonly, isShallow, isSymbol, toRaw } from '../shared';
import {
  ITERATOR_KEY, pauseTracking, reactive, ReactiveFlags, reactiveMap, readonly, readonlyMap, resetTracking,
  shallowReactiveMap,
  shallowReadonlyMap,
  shouldTrack, track,
  trigger,
  TRIGGER_TYPE
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
    // 当用户直接查找原始数据时，由于遍历时会返回proxy包装的对象(this指向proxy)
    // 所以，当在proxy中没有找到时，需要去原始数据中查找（不会被proxy包装）
    if (result === false || result === -1) {
      result = original.apply(toRaw(this), args);
    }
    return result;
  };
});
['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
  const original = Array.prototype[method];
  arrayInstrumentations[method] = function (...args: any[]) {
    pauseTracking();
    // 由于stack类的操作会隐式地读取数组的长度，所以需要暂停track
    // 否则将使其成为一个get与set一体的操作,容易导致死循环
    // 在stack类操作中，依旧会调用对象中的set，所以trigger是正常触发的
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
    if (key === ReactiveFlags.RAW && (receiver ===
                                      (isReadonly
                                          ? isShallow
                                            ? shallowReadonlyMap
                                            : readonlyMap
                                          : isShallow
                                            ? shallowReactiveMap
                                            : reactiveMap
                                      ).get(target))) {
      return target;
    }
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    }
    if (key === ReactiveFlags.IS_SHALLOW) {
      return isShallow;
    }
    if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
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

function createSetter(shallow = false) {
  // TODO 暂时没弄清楚在setter中的shallow有什么作用
  return function (target: object, key: string, value: any, receiver) {
    let oldValue = target[key];
    if (!shallow && !isReadonly(value)) {
      // TODO 暂不清楚为何shallow的value不需要toRaw
      if (!isShallow(value)) {
        // 处理数据污染(避免将响应式数据设置到original中)
        value = toRaw(value);
        oldValue = toRaw(oldValue);
      }
    } else {
      // in shallow mode, objects are set as-is regardless of reactive or not
    }
    const type = Array.isArray(target)
      ? (target.length <= +key ? TRIGGER_TYPE.ADD : TRIGGER_TYPE.SET)
      : (Object.prototype.hasOwnProperty.call(target, key) ? TRIGGER_TYPE.SET : TRIGGER_TYPE.ADD);
    Reflect.set(target, key, value, receiver);
    if (toRaw(receiver) === target) {
      if (oldValue !== value && !Number.isNaN(oldValue) && !Number.isNaN(value)) {
        trigger(target, key, type, value);
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
