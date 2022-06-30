import { effect, track, trigger } from './effect';
import { TRIGGER_TYPE } from './operations';

export function computed<T extends any>(fn: () => T) {
  let dirty = true;
  let _value: T;
  const _effect = effect(fn, {
    lazy: true,
    scheduler() {
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
