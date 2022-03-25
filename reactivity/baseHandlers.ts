import { pauseTracking, resetTracking } from './index';

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
    pauseTracking()
    const result = original.apply(this, args);
    resetTracking()
    return result;
  };
});
