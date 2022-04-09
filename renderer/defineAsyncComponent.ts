import { ref } from '../reactivity';
import { isFunction } from '../shared';
import { Component, createCommentNode, createVNode, onBeforeUnmount, VNode } from './index';

type Loader = (props?: Record<string, any>) => Promise<Component>

export interface AsyncComponentOptions {
  loader: Loader;
  timeout?: number;
  delay?: number;
  loadingComponent?: Component;
  errComponent?: Component;
  onError?: (err: Error, retry: () => void, fail: () => void, retries: number) => void;
}

export function defineAsyncComponent(options: Loader | AsyncComponentOptions) {
  if (isFunction(options)) {
    options = { loader: options };
  }
  // options
  return {
    name: 'AsyncComponent',
    setup() {
      const asyncOptions = options as AsyncComponentOptions;
      const { onError, loadingComponent, delay, errComponent, loader, timeout } = asyncOptions;

      // 加载机制/重试机制
      const error = ref<null | Error>(null);
      const loaded = ref(false);
      let retries = 0;
      let innerComponent: Component | null = null;
      let unmounted = false;
      onBeforeUnmount(() => {
        unmounted = true;
      });

      function load() {
        return loader().catch(err => {
          if (onError && !unmounted) {
            return new Promise<Component>((resolve, reject) => {
              onError(err, () => {
                retries++;
                resolve(load());
              }, reject, retries);
            });
          } else {
            throw err;
          }
        });
      }

      load().then(comp => {
        innerComponent = comp;
        loaded.value = true;
      }).catch((err: Error) => {
        error.value = err;
      });

      // timeout 机制
      const isTimeout = ref(false);
      let timer: any = null;
      timeout && (timer = setTimeout(() => {
        isTimeout.value = true;
      }, timeout));

      // loading 机制
      let loadingTimer: any = null;
      const loading = ref(false);
      if (delay) {
        loadingTimer = setTimeout(() => {
          loading.value = true;
        }, delay);
      } else {
        loading.value = true;
      }
      const placeholder = createCommentNode('placeholder');

      onBeforeUnmount(() => {
        clearTimeout(timer);
        clearTimeout(loadingTimer);
      });

      return () => {
        if (loaded.value) {
          return innerComponent ? createVNode(innerComponent) : placeholder;
        } else if (isTimeout.value) {
          return errComponent ? createVNode(errComponent, { error: error.value }) : placeholder;
        } else if (loading.value && loadingComponent) {
          return createVNode(loadingComponent);
        } else {
          return placeholder;
        }
      };
    }
  };
}
