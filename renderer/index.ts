import { last } from 'lodash-es';
import { isArray, isFunction, isObject, isString } from '../shared';

export interface VNode {
  el?: Container | Text | Comment;
  key?: any;
  type: string | symbol;
  props?: Record<string, any> | null;
  children?: VNode[] | string | null | number;
}

export const TEXT_NODE = Symbol('TEXT');
export const COMMENT_NODE = Symbol('COMMENT');
export const FRAGMENT_NODE = Symbol('FRAGMENT');

interface RendererOptions {
  createElementNode(tag: string): any;

  createTextNode(text: string): any;

  setTextContent(node: Text, text: string): void;

  createCommentNode(text: string): any;

  setCommentText(node: Comment, text: string): void;

  unmount(el: any): void;

  setElementText(el: any, text: string): void;

  patchProps(el: any, prop: string, preVal: any, nextVal: any): void;

  insert(el: any, parent: any, anchor?: any): void;
}

interface Container extends HTMLElement {
  _vnode: VNode;
}

function createRenderer(options: RendererOptions) {
  const {
    unmount,
    patchProps,
    createElementNode,
    setElementText,
    insert,
    createCommentNode,
    setCommentText,
    createTextNode,
    setTextContent
  } = options;

  function render(vnode: VNode, container: string | Container | null) {
    if (isString(container)) {
      container = document.querySelector<Container>(container);
    }
    if (!container) return;
    if (vnode) {
      patch(container._vnode, vnode, container);
    } else if (container._vnode) {
      unmount(container._vnode);
    }
    container._vnode = vnode;
  }

  function patch(n1: VNode | null, n2: VNode, container: any, anchor?: any) {
    if (n1 && n1.type !== n2.type) {
      unmount(n1);
      n1 = null;
    }
    const { type } = n2;
    if (isString(type)) {
      if (!n1) {
        mountElement(n2, container);
      } else {
        patchElement(n1, n2);
      }
    } else if (type === TEXT_NODE) {
      if (!n1) {
        const el = n2.el = createTextNode(n2.children as string);
        insert(el, container, anchor);
      } else {
        const el = n2.el = n1.el as Text;
        if (n2.children !== n1.children) {
          setTextContent(el, n2.children as string);
        }
      }
    } else if (type === COMMENT_NODE) {
      if (!n1) {
        const el = n2.el = createCommentNode(n2.children as string);
        insert(el, container, anchor);
      } else {
        const el = n2.el = n1.el as Comment;
        if (n2.children !== n1.children) {
          setCommentText(el, n2.children as string);
        }
      }
    } else if (type === FRAGMENT_NODE) {
      if (!n1) {
        if (isArray(n2.children)) {
          // 为什么不使用HTMLFragment?
          n2.children?.forEach(node => {
            patch(null, node, container, anchor);
          });
        }
      } else {
        patchChildren(n1, n2, container);
      }
    } else if (isObject(type)) {
      // TODO component type
    } else {
      // TODO other types;
    }
  }

  function patchElement(n1: VNode, n2: VNode) {
    const el = n2.el = n1.el as Container;
    const oldProps = n1.props || {};
    const newProps = n2.props || {};
    for (let key in newProps) {
      if (oldProps[key] !== newProps[key]) {
        patchProps(el, key, oldProps[key], newProps[key]);
      }
    }
    for (let key in oldProps) {
      if (!(key in newProps)) {
        patchProps(el, key, oldProps[key], null);
      }
    }
    patchChildren(n1, n2, el);
  }

  function patchChildren(n1: VNode, n2: VNode, container: Container) {
    if (isString(n2.children)) {
      if (isArray(n1.children)) {
        n1.children.forEach(child => unmount(child));
      }
      if (n1.children !== n2.children) {
        setElementText(container, n2.children as string);
      }
    } else if (isArray(n2.children)) {
      if (isArray(n1.children)) {
        patchKeyedChildren(n1, n2, container);
      } else {
        setElementText(container, '');
        n2.children.forEach(node => {
          patch(null, node, container);
        });
      }
    }
  }

  function patchKeyedChildren(n1: VNode, n2: VNode, container: Container) {
    const oldChildren = n1.children as Array<VNode>;
    const newChildren = n2.children as Array<VNode>;
    const oldLen = oldChildren.length;
    const newLen = newChildren.length;
    // 当前递增序列中最大的index
    let lastIndex = 0;
    for (let i = 0; i < newLen; i++) {
      const newNode = newChildren[i];
      let find = false;
      for (let j = 0; j < oldLen; j++) {
        const oldNode = oldChildren[j];
        if (oldNode.key === newNode.key) {
          find = true;
          patch(oldNode, newNode, container);
          // 如果节点在旧列表中的索引不满足递增,就说明需要移动
          if (j < lastIndex) {
            const preNode = newChildren[i - 1];
            if (preNode) {
              const anchor = preNode.el?.nextSibling;
              // 移动到已经排序好的上一个新节点的后面
              insert(oldNode.el, container, anchor);
            }
          } else {
            lastIndex = j;
          }
          break;
        }
      }
      // 如果在旧节点中没找到，说明是新增
      if (!find) {
        const preNode = newChildren[i - 1];
        let anchor = preNode ? preNode.el!.nextSibling : container.firstChild;
        patch(null, newNode, container, anchor);
      }
    }
    // 同时，如果旧节点在新节点中没找到，说明是移除
    for (let i = 0; i < oldLen; i++) {
      const oldNode = oldChildren[i];
      const has = newChildren.find(newNode => newNode.key === oldNode.key);
      if (!has) {
        unmount(oldNode);
      }
    }
  }

  function mountElement(node: VNode, container: Container) {
    const el = node.el = createElementNode(node.type as string);
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

/**
 * @description 判断prop是否是一个DOMProperties
 * */
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

function patchProps(el: HTMLElement & { _vei: Record<string, any> }, prop: string, preVal: any, nextVal: any) {
  if (/^on/.test(prop)) {
    const eventName = prop.slice(2).toLowerCase();
    // 一个虚拟的事件处理对象，用于变更事件或添加一些额外的处理
    // 通过它更新事件处理函数时不需要调用removeEventListener
    const invokers: any = el._vei || (el._vei = {});
    let invoker = invokers[eventName];
    if (nextVal) {
      if (invoker) {
        invoker.value = nextVal;
        invoker.attached = performance.now();
      } else {
        invokers[eventName] = invoker = (e: any) => {
          // 通过一个attached记录时间绑定的时间，当事件触发时，检查事件触发时间是否早于绑定时间，如果是，则不执行
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
        invoker.attached = performance.now();
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
  } else if (prop === 'style') {
    if (isObject(nextVal)) {
      for (const key in nextVal) {
        el.style[key] = nextVal[key];
      }
    }
    if (isObject(preVal)) {
      for (const key in preVal) {
        if (!(key in nextVal)) {
          el.style[key] = '';
        }
      }
    }
  } else if (shouldSetAsProps(el, prop)) {
    // 这里的type是在DOMProperties中的数据类型
    const type = typeof el[prop];
    if (type === 'boolean' && nextVal === '') {
      el[prop] = true;
    } else {
      el[prop] = nextVal;
    }
  } else {
    // 如果不是一个DOMProperties,则视为HTMLAttributes
    el.setAttribute(prop, nextVal);
  }
}

function unmount(node: VNode) {
  if (node.type === FRAGMENT_NODE) {
    if (Array.isArray(node.children)) {
      node.children.forEach(child => {
        unmount(child);
      });
    }
  } else {
    node.el?.parentNode?.removeChild(node.el);
  }
}

export const renderer = createRenderer({
  createElementNode(tag: string): any {
    return document.createElement(tag);
  },
  setElementText(el: HTMLElement, text: string) {
    el.innerText = text;
  },
  patchProps,
  unmount,
  insert(el: HTMLElement, parent: HTMLElement, anchor?: HTMLElement) {
    if (anchor) {
      parent.insertBefore(el, anchor);
    } else {
      parent.appendChild(el);
    }
  },
  createTextNode(text: string) {
    return document.createTextNode(text);
  },
  setTextContent(el: Text, text: any) {
    el.nodeValue = text;
  },
  setCommentText(el: Comment, text: string) {
    el.nodeValue = text;
  },
  createCommentNode(text: string) {
    return document.createComment(text);
  },
});
