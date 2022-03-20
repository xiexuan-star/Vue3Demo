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
  return new Proxy(obj, {
    get(target, key: string) {
      track(target, key);
      return target[key];
    },
    set(target, key: string, value: any) {
      target[key] = value;
      trigger(target, key);
      return true;
    }
  });
}

export function computed<T extends any>(fn: () => T) {
  let dirty = true;
  let _value: T;
  const _effect = effect(fn, {
    lazy: true, scheduler() {
      if (!dirty) {
        dirty = true;
        trigger(obj, 'value');
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
const targetMap = new WeakMap<object, Map<string, Set<ReactiveEffect>>>();

function getEffects(target: object, key: string) {
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map<string, Set<ReactiveEffect>>()));
  }
  let deps = depsMap.get(key);
  if (!deps) {
    depsMap.set(key, (deps = new Set()));
  }
  return deps;
}

function track(target: Record<any, any>, key: string) {
  if (!activeEffect) return;
  const effects = getEffects(target, key);
  effects.add(activeEffect);
  activeEffect.deps.add(effects);
}

function trigger(target: Record<any, any>, key: string) {
  const effects = getEffects(target, key);
  new Set(effects).forEach(effect => {
    if (effect && effect !== activeEffect) {
      if (effect.option && effect.option.scheduler) {
        effect.option.scheduler(effect.run.bind(effect));
      } else {
        effect.run();
      }
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
