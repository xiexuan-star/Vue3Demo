import { track, trigger } from './effect';
import { TRIGGER_TYPE } from './operations';

class Ref<T = any> {
  constructor(private _value: T) {}

  public readonly __v_isRef = true;

  get value(): T {
    track(this, 'value');
    return this._value;
  }

  set value(v: T) {
    this._value = v;
    trigger(this, 'value', TRIGGER_TYPE.SET);
  }
}

export const ref = <T>(value: T): Ref<T> => {
  return new Ref(value);
};
export const isRef = (v: any): v is Ref => {
  return !!v && v.__v_isRef === true;
};
export type MaybeRef<T> = T | Ref<T>
export const unref = <T>(v: MaybeRef<T>): T => {
  return isRef(v) ? v.value : v;
};
