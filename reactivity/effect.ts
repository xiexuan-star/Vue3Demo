import { isMap } from '../shared';
import { TRIGGER_TYPE } from './operations';

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
  if (type === TRIGGER_TYPE.ADD || type === TRIGGER_TYPE.DELETE || (type === TRIGGER_TYPE.SET && isMap(target))) {
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
  return effect.run.bind(effect);
}
