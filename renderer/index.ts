import { getSequence, isArray, isFunction, isObject, isString } from '../shared';

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
    let j = 0;
    let newEnd = newChildren.length - 1;
    let oldEnd = oldChildren.length - 1;
    let newStartNode = newChildren[j];
    let newEndNode = newChildren[newEnd];
    let oldStartNode = oldChildren[j];
    let oldEndNode = oldChildren[oldEnd];

    function oldStartNext() {
      oldStartNode = oldChildren[j];
    }

    function oldEndNext() {
      oldEndNode = oldChildren[--oldEnd];
    }

    function newStartNext() {
      newStartNode = newChildren[j];
    }

    function newEndNext() {
      newEndNode = newChildren[--newEnd];
    }

    while (j <= newEnd && j <= oldEnd) {
      if (newStartNode.key === oldStartNode.key) {
        patch(oldStartNode, newStartNode, container);
        j++;
        newStartNext();
        oldStartNext();
      } else if (newEndNode.key === oldEndNode.key) {
        patch(oldEndNode, newEndNode, container);
        newEndNext();
        oldEndNext();
      } else {
        break;
      }
    }
    if (j > newEnd && j > oldEnd) {
      // 绝对理想情况，顺序没有发生变化
      return;
    } else if (j > newEnd && j <= oldEnd) {
      // 说明指针相交，且旧节点更多，此时应该删除
      for (let i = j; i <= oldEnd; i++) {
        unmount(oldChildren[i]);
      }
    } else if (j <= newEnd && j > oldEnd) {
      // 与上一个情况相反，应新增节点
      const anchor = newChildren[newEnd + 1]?.el;
      while (j <= newEnd) {
        patch(null, newChildren[j++], container, anchor);
      }
    } else {
      // 没有出现上述情况，说明是非理想情况，需要进行移动
      // 构建索引数组
      const source = Array.from({ length: newEnd - j + 1 }).fill(-1) as number[];
      // 填充索引数组
      const newNodeMap: Record<string, number> = {};
      for (let i = j; i <= newEnd; i++) {
        const node = newChildren[i];
        newNodeMap[node.key] = i;
      }
      let needMove = false;
      let lastIndex = j;
      for (let i = j; i <= oldEnd; i++) {
        const oldNode = oldChildren[i];
        const newNodeIndex = newNodeMap[oldNode.key];
        const hasNewNode = newNodeIndex !== undefined;
        if (hasNewNode) {
          // 说明新旧节点可复用
          patch(oldNode, newChildren[newNodeIndex], container);
          source[newNodeIndex - j] = i;
          if (lastIndex > newNodeIndex) {
            // 同简单Diff，通过记录最大索引的方式判断索引是否为递增趋势
            // 如果后续index小于lastIndex，那说明不是递增，此时需要移动节点
            needMove = true;
          } else {
            lastIndex = newNodeIndex;
          }
        } else {
          // 如果没找到新节点，那说明需要卸载
          unmount(oldNode);
        }
      }
      if (needMove) {
        // 如果需要移动，则进入下一步，对最长递增子序列的判断
        const sequence = getSequence(source);
        let seqIndex = sequence.length - 1;
        for (let i = newEnd; i >= j; i--) {
          // 开始移动节点
          const sourceIndex = i - j;
          const sourceValue = source[sourceIndex];
          if (sourceValue === -1) {
            // 需要新增的节点,由于是从末尾开始遍历，插入到后一个节点之前即可
            const anchor = newChildren[i + 1]?.el;
            patch(null, newChildren[i], container, anchor);
          } else if (sourceIndex !== sequence[seqIndex]) {
            // 如果在递增序列中没找到该sourceIndex，说明需要移动
            // 同样移动至下一个节点元素之前即可
            const anchor = newChildren[i + 1]?.el;
            insert(newChildren[i].el, container, anchor);
          } else {
            seqIndex--;
          }
        }
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
