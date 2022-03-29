import { hasOwn, isMap, isShallow, toRaw } from '../shared';
import { ITERATOR_KEY, MAP_KEYS_ITERATOR_KEY, track, trigger } from './effect';
import { TRIGGER_TYPE } from './operations';
import { ReactiveFlags, toReactive, toReadonly } from './reactive';

export type CollectionTypes = IterableCollections | WeakCollections
type IterableCollections = Map<any, any> | Set<any>
type WeakCollections = WeakMap<any, any> | WeakSet<any>
type MapTypes = Map<any, any> | WeakMap<any, any>
type SetTypes = Set<any> | WeakSet<any>

function add(this: SetTypes, value: unknown) {
  value = toRaw(value);
  const target = toRaw(this);
  const hasKey = target.has(value);
  const res = target.add(value);
  if (!hasKey) {
    trigger(target, value, TRIGGER_TYPE.ADD);
  }
  return res;
}

function deleteProperty(this: CollectionTypes, key: unknown) {
  const target = toRaw(this);
  const hasKey = target.has(key);
  const res = target.delete(key);
  if (hasKey) {
    trigger(target, key, TRIGGER_TYPE.DELETE);
  }
  return res;
}

function forEach(
  target: IterableCollections,
  callback: (v: unknown, k: unknown, c: IterableCollections) => any,
  thisArg?: any,
  isReadonly = false,
  isShallow = false) {
  target = toRaw(target);
  track(target, ITERATOR_KEY);
  const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
  target.forEach((v, k, c) => {
    callback.call(thisArg, wrap(v), wrap(k), target);
  });
}

const toShallow = <T extends unknown>(value: T): T => value;

function get(
  target: MapTypes,
  key: unknown,
  isReadonly = false,
  isShallow = false
) {
  target = target[ReactiveFlags.RAW] as MapTypes;
  // const rawKey = toRaw(key);
  track(target, key);
  const had = target.has(key);
  if (had) {
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
    return wrap(target.get(key));
  }
}

function set(this: MapTypes, key: unknown, value: unknown) {
  const target = toRaw(this);
  const had = target.has(key);
  const res = target.set(key, value);
  if (had) {
    trigger(target, key, TRIGGER_TYPE.SET, value);
  } else {
    trigger(target, key, TRIGGER_TYPE.ADD, value);
  }
  return res;
}

function size(target: IterableCollections, isReadonly = false) {
  target = toRaw(target);
  !isReadonly && track(target, ITERATOR_KEY);
  return Reflect.get(target, 'size', target);
}

function iterator(target: IterableCollections,
                  method: symbol | string,
                  isShallow = false,
                  isReadonly = false) {
  target = toRaw(target);
  const targetIsMap = isMap(target);
  track(target, (targetIsMap && method === 'keys') ? MAP_KEYS_ITERATOR_KEY : ITERATOR_KEY);
  const isPair = method === 'entries' || (method === Symbol.iterator && targetIsMap);
  const it = target[method]();
  const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
  return {
    next() {
      const { done, value } = it.next();
      return done
        ? { value, done }
        : { done, value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value) };
    },
    [Symbol.iterator]() {
      return this;
    }
  };
}

const createInstrumentations = () => {
  const mutableInstrumentations = {
    get(this: MapTypes, key: unknown) {
      return get(this, key);
    },
    get size() {
      return size(this as unknown as IterableCollections);
    },
    add,
    set,
    delete: deleteProperty,
    forEach(this: IterableCollections, callback, thisArg) {
      forEach(this, callback, thisArg);
    }
  };
  const readonlyInstrumentations = {};
  const shallowReadonlyInstrumentations = {};
  const shallowInstrumentations = {};
  ['values', 'keys', 'entries', Symbol.iterator].forEach(method => {
    Reflect.set(mutableInstrumentations, method, function (this: IterableCollections) {
      return iterator(this, method);
    });
    Reflect.set(readonlyInstrumentations, method, function (this: IterableCollections) {
      return iterator(this, method, false, true);
    });
    Reflect.set(shallowInstrumentations, method, function (this: IterableCollections) {
      return iterator(this, method, true, false);
    });
    Reflect.set(shallowReadonlyInstrumentations, method, function (this: IterableCollections) {
      return iterator(this, method, true, true);
    });
  });
  return {
    mutableInstrumentations, readonlyInstrumentations, shallowReadonlyInstrumentations, shallowInstrumentations
  };
};
const {
  mutableInstrumentations,
  readonlyInstrumentations,
  shallowInstrumentations,
  shallowReadonlyInstrumentations
} = createInstrumentations();

export const mutableCollectionHandlers: ProxyHandler<CollectionTypes> = {
  get: /*#__PURE__*/ createInstrumentationGetter(false, false)
};

export const shallowCollectionHandlers: ProxyHandler<CollectionTypes> = {
  get: /*#__PURE__*/ createInstrumentationGetter(false, true)
};

export const readonlyCollectionHandlers: ProxyHandler<CollectionTypes> = {
  get: /*#__PURE__*/ createInstrumentationGetter(true, false)
};

export const shallowReadonlyCollectionHandlers: ProxyHandler<CollectionTypes> =
  {
    get: /*#__PURE__*/ createInstrumentationGetter(true, true)
  };

export function createInstrumentationGetter(isReadonly = false, shallow = false) {
  const instrumentations = shallow
    ? isReadonly
      ? shallowReadonlyInstrumentations
      : shallowInstrumentations
    : isReadonly
      ? readonlyInstrumentations
      : mutableInstrumentations;
  return function (target: CollectionTypes, key: string | symbol, receiver: CollectionTypes) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    }
    if (key === ReactiveFlags.IS_SHALLOW) {
      return isShallow;
    }
    if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    }
    if (key === ReactiveFlags.RAW) {
      return target;
    }
    return Reflect.get(
      hasOwn(instrumentations, key) && key in target
        ? instrumentations
        : target,
      key,
      receiver
    );
  };
};
