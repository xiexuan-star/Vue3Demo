const arrayInstrumentations: Record<string, Function> = {};

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
    shouldTrack = false;
    const result = original.apply(this, args);
    shouldTrack = true;
    return result;
  };
});

enum TRIGGER_TYPE {
  SET = 'SET',
  ADD = 'ADD',
  DELETE = 'DELETE'
}

let shouldTrack = true;
const isSymbol = (val: unknown): val is symbol => typeof val === 'symbol';
const builtInSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    .map(key => (Symbol as any)[key])
    .filter(isSymbol)
);

const ITERATOR_KEY = Symbol('iterator');
const reactiveMap = new WeakMap<object, object>();

type ReactiveEffectOption = Partial<{
  scheduler(f: Function): void;
  lazy: boolean
}>

class ReactiveEffect<T extends any = any> {
  private parent: ReactiveEffect | null = null;
  deps = new Set<Set<ReactiveEffect>>();

  constructor(public fn: () => T, public option?: ReactiveEffectOption) {}

  run() {
    let parent: ReactiveEffect | null = activeEffect;
    while (parent) {
      if (parent === this) {
        return;
      }
      parent = parent.parent;
    }
    this.parent = activeEffect;
    activeEffect = this;
    effectStack.push(this);
    cleanup(this);
    const res = this.fn();
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
    return res;
  }
}

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

export function computed<T extends any>(fn: () => T) {
  let dirty = true;
  let _value: T;
  const _effect = effect(fn, {
    lazy: true, scheduler() {
      if (!dirty) {
        dirty = true;
        trigger(obj, 'value', TRIGGER_TYPE.SET, null);
      }
    }
  });

  const obj = {
    get value(): T {
      track(obj, 'value');
      if (dirty) {
        dirty = false;
        return _value = _effect()!;
      } else {
        return _value;
      }
    }
  };
  return obj;
}

type SourceValueType<T> = T extends () => infer P ? P : T;

export function watch<T>(
  source: T,
  handler: (newValue: SourceValueType<T>, oldValue: SourceValueType<T> | undefined, onInvalidate: (f: () => void) => void) => void,
  // in options, you can control the handler's call time by option flush
  { immediate, flush }: { immediate?: boolean, flush?: 'pre' | 'post' | 'sync' } = {}) {
  let oldValue: SourceValueType<T> | undefined, newValue: SourceValueType<T> | undefined;
  const getter: () => SourceValueType<T> = typeof source === 'function'
    ? source as unknown as () => SourceValueType<T>
    : (): SourceValueType<T> => traverse(source) as SourceValueType<T>;
  let cleanup: () => void;

  function onInvalidate(f: () => void) {
    cleanup = f;
  }

  const scheduler = () => {
    newValue = _run();
    cleanup && cleanup();
    handler(newValue!, oldValue, onInvalidate);
    oldValue = newValue;
  };
  const _run = effect(getter, {
    scheduler: () => {
      if (flush === 'post') {
        Promise.resolve().then(scheduler);
      } else {
        scheduler();
      }
    }, lazy: true
  });
  // in immediate mode, first handler called with an undefined oldValue, it's in line with expectations
  if (immediate) {
    scheduler();
  } else {
    oldValue = _run();
  }
}

function traverse(source: unknown, seen = new Set<unknown>()) {
  if (!source || seen.has(source)) return source;
  seen.add(source);
  if (typeof source === 'object') {
    for (const sourceKey in source) {
      traverse(source[sourceKey], seen);
    }
  }
  return source;
}

const effectStack: (ReactiveEffect | null)[] = [];
let activeEffect: ReactiveEffect | null = null;
const targetMap = new WeakMap<object, Map<any, Set<ReactiveEffect>>>();

function getEffects(target: object, key: unknown) {
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map<unknown, Set<ReactiveEffect>>()));
  }
  let deps = depsMap.get(key);
  if (!deps) {
    depsMap.set(key, (deps = new Set()));
  }
  return deps;
}

function track(target: Record<any, any>, key: unknown) {
  if (!activeEffect) return;
  const effects = getEffects(target, key);
  effects.add(activeEffect);
  activeEffect.deps.add(effects);
}

function trigger(target: Record<any, any>, key: unknown, type: TRIGGER_TYPE, newVal: unknown) {
  const effectRun = new Set<ReactiveEffect>();
  const effects = getEffects(target, key);
  effects.forEach(effect => {
    effect && effect !== activeEffect && effectRun.add(effect);
  });
  if (type === TRIGGER_TYPE.ADD || type === TRIGGER_TYPE.DELETE) {
    const iteratorEffect = getEffects(target, ITERATOR_KEY);
    iteratorEffect.forEach(effect => {
      effect && effect !== activeEffect && effectRun.add(effect);
    });
  }
  if (type === TRIGGER_TYPE.ADD && Array.isArray(target)) {
    const lengthEffect = getEffects(target, 'length');
    lengthEffect.forEach(effect => {
      effect && effect !== activeEffect && effectRun.add(effect);
    });
  }
  if (key === 'length' && Array.isArray(target)) {
    const depsMap = targetMap.get(target);
    depsMap && depsMap.forEach((effect, key) => {
      if (key !== 'length' && key !== ITERATOR_KEY && key >= (newVal as number)) {
        effect.forEach(effect => {
          effect && effect !== activeEffect && effectRun.add(effect);
        });
      }
    });
  }
  effectRun.forEach(effect => {
    if (effect.option && effect.option.scheduler) {
      effect.option.scheduler(effect.run.bind(effect));
    } else {
      effect.run();
    }
  });
}

function cleanup(effect: ReactiveEffect) {
  const deps = effect.deps;
  deps.forEach(effects => {
    effects.delete(effect);
  });
  deps.clear();
}

export function effect<T extends any>(fn: () => T, option?: ReactiveEffectOption) {
  const effect = new ReactiveEffect(fn, option);
  if (!option || !option.lazy) {
    effect.run();
  }
  return effect.run.bind(effect);
}
