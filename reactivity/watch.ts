import { effect } from './effect';

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
