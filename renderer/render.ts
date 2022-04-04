import { isArray, isFunction, isObject, isString } from '../shared';

interface RendererOptions {
  createElement(tag: string): any;

  unmount(el: any): void;

  setElementText(el: any, text: string): void;

  patchProps(el: any, prop: string, preVal: any, nextVal: any): void;

  insert(el: any, parent: any, anchor?: any | null): void;
}

function createRenderer(options: RendererOptions) {
  const { unmount, patchProps, createElement, setElementText, insert } = options;

  function render(vnode: any, container: any) {
    if (typeof container === 'string') {
      container = document.querySelector<HTMLElement>(container);
      if (!container) return;
    }
    if (vnode) {
      patch(container._vnode, vnode, container);
    } else if (container._vnode) {
      unmount(container._vnode);
    }
    container._vnode = vnode;
  }

  function patch(n1: any, n2: any, container: any) {
    if (n1 && n1.type !== n2.type) {
      unmount(n1);
      n1 = null;
    }
    const { type } = n2;
    if (isString(type)) {
      if (!n1) {
        mountElement(n2, container);
      } else {
        // TODO update
        unmount(n1);
        mountElement(n2, container);
      }
    } else if (isObject(type)) {
      // TODO component type
    } else {
      // TODO other types;
    }
  }

  function mountElement(node: any, container: any) {
    const el = node.el = createElement(node.type);
    if (node.props) {
      for (const key in node.props) {
        patchProps(el, key, null, node.props[key]);
      }
    }
    if (typeof (node.children) === 'string') {
      setElementText(el, node.children);
    } else if (Array.isArray(node.children)) {
      node.children.forEach(child => {
        patch(null, child, el);
      });
    }
    insert(el, container);
  }

  return { render };
}

function shouldSetAsProps(el: HTMLElement, prop: string) {
  if (prop === 'form' && el.tagName === 'INPUT') return false;
  return prop in el;
}

function normalizeClass(classValue: unknown) {
  if (isString(classValue)) {
    return classValue;
  } else if (isArray(classValue)) {
    return classValue.reduce((res, c) => {
      return res + ` ${ normalizeClass(c) }`;
    }, '');
  } else if (isObject(classValue)) {
    return Object.entries(classValue).reduce((res, [c, need]) => {
      return need ? res + ` ${ c }` : res;
    }, '');
  }
  return '';
}

function patchProps(el: HTMLElement & { _vei: Record<string, any> }, prop: string, preVal, nextVal) {
  if (/^on/.test(prop)) {
    const eventName = prop.slice(2).toLowerCase();
    const invokers: any = el._vei || (el._vei = {});
    let invoker = invokers[eventName];
    if (nextVal) {
      if (invoker) {
        invoker.value = nextVal;
        invoker.attached = performance.now();
      } else {
        invokers[eventName] = invoker = (e: any) => {
          if (invoker.attached > e.timeStamp) return;
          // support array event
          if (isArray(invoker.value)) {
            for (const handler of invoker.value) {
              handler(e);
            }
          } else {
            isFunction(invoker.value) && invoker.value(e);
          }
        };
        invoker.value = nextVal;
        Reflect.set(el, '_vei', invoker);
        el.addEventListener(eventName, invoker);
      }
    } else if (invoker) {
      el.removeEventListener(eventName, invoker);
    }
    if (invoker) {
      invoker[eventName] = nextVal;
    }

  } else if (prop === 'class') {
    el.className = normalizeClass(nextVal);
  } else if (shouldSetAsProps(el, prop)) {
    const type = typeof el[prop];
    if (type === 'boolean' && nextVal === '') {
      el[prop] = true;
    } else {
      el[prop] = nextVal;
    }
  } else {
    el.setAttribute(prop, nextVal);
  }
}

export const renderer = createRenderer({
  createElement(tag: string): any {
    return document.createElement(tag);
  },
  setElementText(el: HTMLElement, text: string) {
    el.innerText = text;
  },
  patchProps,
  unmount(vnode: any) {
    vnode.el.parentNode?.removeChild(vnode.el);
  },
  insert(el: HTMLElement, parent: HTMLElement, anchor?: HTMLElement) {
    if (anchor) {
      el.insertBefore(parent, anchor);
    } else {
      parent.appendChild(el);
    }
  }
});
