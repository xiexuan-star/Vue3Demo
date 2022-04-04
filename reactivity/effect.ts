import { isFunction, isMap } from '../shared';
import { TRIGGER_TYPE } from './operations';

interface ReactiveEffectRunner<T extends any = any> {
  (): T;

  effect: ReactiveEffect;
}

export let shouldTrack = true;
const trackStack: boolean[] = [];

export function pauseTracking() {
  trackStack.push(shouldTrack);
  shouldTrack = false;
}

export function enableTracking() {
  trackStack.push(shouldTrack);
  shouldTrack = true;
}

export function resetTracking() {
  const last = trackStack.pop();
  shouldTrack = last === undefined ? true : last;
}

export const ITERATOR_KEY = Symbol('iterator');
export const MAP_KEYS_ITERATOR_KEY = Symbol('map-key-iterator');

type ReactiveEffectOption = Partial<{
  scheduler(f: Function): void;
  lazy: boolean
}>

class ReactiveEffect<T extends any = any> {
  private parent: ReactiveEffect | null = null;
  deps = new Set<Set<ReactiveEffect>>();
  private onStop?: Function;
  private active = true;

  constructor(public fn: () => T, public option?: ReactiveEffectOption) {}

  stop() {
    if (this.active) {
      cleanup(this);
      this.active = false;
      if (isFunction(this.onStop)) {
        this.onStop();
      }
    }
  }

  run() {
    // TODO When I call the stop function, I can't restore the effect
    if (!this.active) {
      return this.fn();
    }
    let parent: ReactiveEffect | null = activeEffect;
    // 通过parent记录所有在一次trigger中调用的effect
    // 所以，当之前触发的effect与当前调用的effect是同一个时, 不再触发, 否则会出现循环
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
    // effectStack用于嵌套的effect，当一个effect执行完毕后，复原activeEffect
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
    this.parent = null;
    return res;
  }
}

const effectStack: (ReactiveEffect | null)[] = [];
let activeEffect: ReactiveEffect | null = null;
const targetMap = new WeakMap<object, Map<any, Set<ReactiveEffect>>>();

export function stop(runner: ReactiveEffectRunner) {
  runner.effect.stop();
}

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

export function track(target: Record<any, any>, key: unknown) {
  if (!activeEffect) return;
  const effects = getEffects(target, key);
  effects.add(activeEffect);
  activeEffect.deps.add(effects);
}

export function trigger(target: Record<any, any>, key: unknown, type: TRIGGER_TYPE, newVal?: unknown) {
  const effectRun = new Set<ReactiveEffect>();
  const effects = getEffects(target, key);
  effects.forEach(effect => {
    effect && effect !== activeEffect && effectRun.add(effect);
  });
  // 不管是添加还是删除，其实都会影响遍历的结果
  // 由于Map数据结构的forEach方法不仅关系键，还关系值，所以Map的set操作也影响了遍历的结果
  if (type === TRIGGER_TYPE.ADD || type === TRIGGER_TYPE.DELETE || ((type === TRIGGER_TYPE.SET) && isMap(target))) {
    const iteratorEffect = getEffects(target, ITERATOR_KEY);
    iteratorEffect.forEach(effect => {
      effect && effect !== activeEffect && effectRun.add(effect);
    });
  }
  // 由于keys的存在，Map结构有可能只受key的影响
  // 所以，Map结构的add与delete需要同时触发mapKeys的effect
  if ((type === TRIGGER_TYPE.ADD || type === TRIGGER_TYPE.DELETE) && isMap(target)) {
    const iteratorEffect = getEffects(target, MAP_KEYS_ITERATOR_KEY);
    iteratorEffect.forEach(effect => {
      effect && effect !== activeEffect && effectRun.add(effect);
    });
  }
  // 当向数组中新增元素时，需要同时触发数组的length的effect
  if (type === TRIGGER_TYPE.ADD && Array.isArray(target)) {
    const lengthEffect = getEffects(target, 'length');
    lengthEffect.forEach(effect => {
      effect && effect !== activeEffect && effectRun.add(effect);
    });
  }
  // 当为数组设置length时，需要触发那些受此次操作影响的effect
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

export function cleanup(effect: ReactiveEffect) {
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
  const result: ReactiveEffectRunner = effect.run.bind(effect) as any;
  result.effect = effect;
  return result;
}
