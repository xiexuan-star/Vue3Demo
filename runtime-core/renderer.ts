import { effect, isRef, reactive, shallowReactive, shallowReadonly, unref } from '../reactivity';
import { getSequence, isArray, isFunction, isObject, isString } from '../shared';

export interface PatchFn {
  (n1: null | VNode, n2: VNode, container: Container, anchor?: any): void;
}

export interface PatchKeyedChildrenFn {
  (n1: VNode, n2: VNode, container: Container): void;
}

export interface UnmountFn {
  (vnode: VNode): void;
}

export interface MoveFn {
  (vnode: VNode, container: Container, anchor?: any): void;
}

export interface Component {
  name?: string;
  __isKeepAlive?: boolean;
  __isTeleport?: boolean;

  move?(vnode: VNode, container: Container, anchor: any, handler: { move }): void;

  process?(n1: null | VNode, n2: VNode, container: Container, anchor: any,
           handler: {
             patch: PatchFn,
             patchKeyedChildren: PatchKeyedChildrenFn,
             unmount: UnmountFn,
             move: MoveFn
           }): void;

  props?: Record<string, any>;

  data?(): Record<string, any>;

  beforeCreate?(): any;

  beforeMount?(): any;

  beforeUpdate?(): any;

  created?(): any;

  updated?(): any;

  mounted?(): any;

  unmounted?(): any;

  beforeUnmount?(): any;

  setup?(props: Record<string, any>, context: {
    emit: (event: string, ...args: unknown[]) => void,
    attrs: Record<string, any>,
    slots: Record<string, (props?: Record<string, any>) => VNode>
  }): (() => VNode) | Record<string, any>;

  render?(context: any, cache: any[]): VNode;
}

export interface ComponentInstance {
  state: Record<string, any>;
  props: Record<string, any>;
  attrs: Record<string, any>;
  isMounted: boolean;
  subTree: VNode | null;
  mounted: Function[];
  beforeUnmount: Function[];
  unmounted: Function[];
  cache: any[];
  keepAliveCtx?: { createElementNode(tag: string): any, move(vnode: VNode, container: Container, anchor?: any): void };

  _deActivate?(vnode: VNode): void;

  _activate?(vnode: VNode, container: Container, anchor?: any): void;
}

export interface VNode {
  el?: Container | Text | Comment;
  key?: any;
  keptAlive?: boolean;
  shouldKeepAlive?: boolean;
  keepAliveInstance?: ComponentInstance;
  type: string | symbol | Component | ((props?: Record<string, any>) => VNode);
  props?: Record<string, any> | null;
  children?: VNode[] | string | null | number | (Record<string, (...args: unknown[]) => VNode>);
  component?: ComponentInstance;
  transition?: {
    beforeEnter(el: HTMLElement): void
    enter(el: HTMLElement): void;
    leave(el: HTMLElement, performRemove: () => void): void
  };
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

let currentInstance: ComponentInstance | null = null;

export function getCurrentInstance() {
  return currentInstance;
}

function setCurrentInstance(instance: ComponentInstance | null) {
  currentInstance = instance;
}

export function onUnmounted(cb: Function) {
  if (currentInstance) {
    currentInstance.unmounted.push(cb);
  } else {
    console.log('onUnmount only can be called in setup function');
  }
}

export function onBeforeUnmount(cb: Function) {
  if (currentInstance) {
    currentInstance.beforeUnmount.push(cb);
  } else {
    console.log('onBeforeUnmount only can be called in setup function');
  }
}

export function onMounted(cb: Function) {
  if (currentInstance) {
    currentInstance.mounted.push(cb);
  } else {
    console.log('onMounted only can be called in setup function');
  }
}

export function createVNode(type: VNode['type'], props?: VNode['props'], children?: VNode['children']): VNode {
  const result: VNode = { type };
  if (props) {
    Reflect.set(result, 'props', { ...props });
    props.key != null && Reflect.set(result, 'key', props.key);
    Reflect.deleteProperty(result.props!, 'key');
  }
  children && Reflect.set(result, 'children', children);
  return result;
}

export function createCommentNode(children: string) {
  return { type: COMMENT_NODE, children };
}

export function createTextNode(children: string) {
  return { type: TEXT_NODE, children };
}

const queue = new Set<Function>();
let isFlushing = false;
const p = Promise.resolve();

function queueJob(job: Function) {
  queue.add(job);
  if (!isFlushing) {
    isFlushing = true;
    p.then(() => {
      try {
        console.log('micro task!');
        queue.forEach(f => f());
      } finally {
        isFlushing = false;
        queue.clear();
      }
    });
  }
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
    if (!n2) return;
    if (n1 && n1.type !== n2.type) {
      unmount(n1);
      n1 = null;
    }
    const { type } = n2;
    if (isString(type)) {
      if (!n1) {
        mountElement(n2, container, anchor);
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
          // ??????????????????HTMLFragment?
          n2.children?.forEach(node => {
            patch(null, node, container, anchor);
          });
        }
      } else {
        patchChildren(n1, n2, container);
      }
    } else if (isObject(type) || isFunction(type)) {
      if ((type as Component).__isTeleport) {
        // ?????????Teleport????????????????????????????????????teleport??????
        (type as Component).process!(n1, n2, container, anchor, { patch, patchKeyedChildren, unmount, move });
      } else if (!n1) {
        // keepAlive????????????????????????????????????activate??????????????????dom
        if (n2.keptAlive) {
          n2.keepAliveInstance?._activate!(n2, container, anchor);
        } else {
          mountComponent(n2, container, anchor);
        }
      } else {
        patchComponent(n1, n2, container, anchor);
      }
    } else {
      // TODO other types;
    }
  }

  function resolveProps(options: Record<string, any> = {}, propsData?: Record<string, any> | null) {
    const props: Record<string, any> = {};
    const attrs: Record<string, any> = {};
    propsData && Object.entries(propsData).forEach(([key, value]) => {
      if (key in options || key.startsWith('on')) {
        props[key] = value;
      } else {
        attrs[key] = value;
      }
    });
    return [props, attrs];
  }

  function hasPropsChange(prevProps: Record<string, any>, nextProps: Record<string, any>) {
    const nextKeys = Object.keys(nextProps);
    const prevKeys = Object.keys(prevProps);
    if (nextKeys.length !== prevKeys.length) return true;
    for (let i = 0; i < nextKeys.length; i++) {
      const key = nextKeys[i];
      if (nextProps[key] !== prevProps[key]) return true;
    }
    return false;
  }

  function move(vnode: VNode, container: Container, anchor?: any) {
    if (vnode.type === FRAGMENT_NODE) {
      isArray(vnode.children) &&
      vnode.children.forEach(child => {
        move(child, container, anchor);
      });
    } else if (isObject(vnode.type) && (vnode.type as Component).__isTeleport) {
      // ?????????Teleport????????????????????????????????????teleport??????
      (vnode.type as Component).move!(vnode, container, anchor, { move });
    } else if (vnode.component) {
      move(vnode.component!.subTree!, container, anchor);
    } else {
      function performRemove() {
        insert(vnode.el, container, anchor);
      }

      if (vnode.transition) {
        vnode.transition.leave(vnode.el! as any, performRemove);
      } else {
        performRemove();
      }
    }
  }

  function mountComponent(initialVNode: VNode, container: Container, anchor?: any) {
    const isFunctional = isFunction(initialVNode.type);
    const componentOptions = (isFunctional ? {
      render: initialVNode.type,
      props: initialVNode.props
    } : initialVNode.type) as Component;
    // ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
    const {
      data,
      props: propsOption,
      beforeCreate,
      beforeMount,
      beforeUpdate,
      created,
      mounted,
      updated,
      unmounted,
      setup,
      __isKeepAlive
    } = componentOptions;
    let { render } = componentOptions;
    beforeCreate && beforeCreate();
    const state = reactive(data && data() || {});
    const [props, attrs] = resolveProps(propsOption, initialVNode.props);

    const instance: ComponentInstance = {
      state,
      props: shallowReactive(props),
      attrs: shallowReactive(attrs),
      isMounted: false,
      subTree: null,
      mounted: [],
      unmounted: [],
      beforeUnmount: [],
      cache: []
    };
    if (__isKeepAlive) {
      instance.keepAliveCtx = {
        move,
        createElementNode
      };
    }
    mounted && instance.mounted.push(mounted);
    unmounted && instance.unmounted.push(unmounted);
    let setupState: Record<string, any> | undefined;

    function emit(event: string, ...args: unknown[]) {
      const eventName = `on${ event[0].toUpperCase() + event.slice(1) }`;
      const handler = props[eventName];
      isFunction(handler) && handler(...args);
    }

    const slots: any = initialVNode.children || {};
    // currentInstance ??????setup????????????
    setCurrentInstance(instance);
    const setupResult = setup && setup(shallowReadonly(props), { attrs, emit, slots });
    setCurrentInstance(null);
    if (isFunction(setupResult)) {
      if (!!render) console.log('render function is overwrite');
      render = setupResult;
    } else if (isObject(setupResult)) {
      setupState = setupResult;
    }
    const renderContext = new Proxy(instance, {
      get(t, k: string) {
        if (k === 'key') return;
        // ????????????slots???????????????????????????slot?????????context???render??????
        if (k === '$slots') return slots;
        const { props, attrs, state } = instance;
        if (k in state) {
          return unref(state[k]);
        } else if (k in props) {
          return unref(props[k]);
        } else if (k in attrs) {
          return unref(attrs[k]);
        } else if (setupState && k in setupState) {
          return unref(setupState[k]);
        } else {
          console.log(`property ${ k } it's exist in this context`);
        }
      },

      set(t, k: string, v: any) {
        const { props, attrs, state } = instance;
        if (k in state) {
          isRef(state[k]) ? state[k].value = v : state[k] = v;
        } else if (k in props) {
          isRef(props[k]) ? props[k].value = v : props[k] = v;
        } else if (k in attrs) {
          isRef(attrs[k]) ? attrs[k].value = v : attrs[k] = v;
        } else if (setupState && k in setupState) {
          isRef(setupState[k]) ? setupState[k].value = v : setupState[k] = v;
        } else {
          console.log(`property ${ k } isn't exist in this context`);
        }
        return true;
      },
    });
    created && created.call(renderContext);
    initialVNode.component = instance;
    // ???effect????????????????????????
    effect(() => {
      const subTree = render!.call(renderContext, renderContext, instance.cache);
      if (!instance.isMounted) {
        beforeMount && beforeMount.call(renderContext);
        patch(null, subTree, container, anchor);
        initialVNode.el = subTree.el;
        instance.isMounted = true;
        queueJob(() => instance.mounted.forEach(cb => cb.call(renderContext)));
      } else {
        beforeUpdate && beforeUpdate.call(renderContext);
        patch(instance.subTree, subTree, container, anchor);
        updated && queueJob(updated.bind(renderContext));
      }
      instance.subTree = subTree;
    }, { scheduler: queueJob });
  }

  function patchComponent(n1: VNode, n2: VNode, container: Container, anchor?: any) {
    const instance = n2.component = n1.component;
    n2.el = n1.el;
    const { props, attrs } = instance!;
    if (hasPropsChange(n1.props = {}, n2.props = {})) {
      const [nextProps, nextAttrs] = resolveProps((n2.type as Component).props, n2.props);
      for (const nextPropsKey in nextProps) {
        props[nextPropsKey] = nextProps[nextPropsKey];
      }
      for (const nextAttrsKey in nextAttrs) {
        props[nextAttrsKey] = nextProps[nextAttrsKey];
      }
      for (const key in props) {
        if (!(key in nextProps)) delete props[key];
      }
      for (const key in attrs) {
        if (!(key in nextAttrs)) delete attrs[key];
      }
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
      // ?????????????????????????????????????????????
      return;
    } else if (j > newEnd && j <= oldEnd) {
      // ????????????????????????????????????????????????????????????
      for (let i = j; i <= oldEnd; i++) {
        unmount(oldChildren[i]);
      }
    } else if (j <= newEnd && j > oldEnd) {
      // ??????????????????????????????????????????
      const anchor = newChildren[newEnd + 1]?.el;
      while (j <= newEnd) {
        patch(null, newChildren[j++], container, anchor);
      }
    } else {
      // ????????????????????????????????????????????????????????????????????????
      // ??????????????????
      const source = Array.from({ length: newEnd - j + 1 }).fill(-1) as number[];
      // ??????????????????
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
          // ???????????????????????????
          patch(oldNode, newChildren[newNodeIndex], container);
          source[newNodeIndex - j] = i;
          if (lastIndex > newNodeIndex) {
            // ?????????Diff?????????????????????????????????????????????????????????????????????
            // ????????????index??????lastIndex???????????????????????????????????????????????????
            needMove = true;
          } else {
            lastIndex = newNodeIndex;
          }
        } else {
          // ????????????????????????????????????????????????
          unmount(oldNode);
        }
      }
      if (needMove) {
        // ???????????????????????????????????????????????????????????????????????????
        const sequence = getSequence(source);
        let seqIndex = sequence.length - 1;
        for (let i = newEnd; i >= j; i--) {
          // ??????????????????
          const sourceIndex = i - j;
          const sourceValue = source[sourceIndex];
          if (sourceValue === -1) {
            // ?????????????????????,?????????????????????????????????????????????????????????????????????
            const anchor = newChildren[i + 1]?.el;
            patch(null, newChildren[i], container, anchor);
          } else if (sourceIndex !== sequence[seqIndex]) {
            // ????????????????????????????????????sourceIndex?????????????????????
            // ????????????????????????????????????????????????
            const anchor = newChildren[i + 1]?.el;
            insert(newChildren[i].el, container, anchor);
          } else {
            seqIndex--;
          }
        }
      }
    }
  }


  function mountElement(vnode: VNode, container: Container, anchor?: any) {
    const el = vnode.el = createElementNode(vnode.type as string);
    if (vnode.props) {
      for (const key in vnode.props) {
        patchProps(el, key, null, vnode.props[key]);
      }
    }
    if (typeof (vnode.children) === 'string') {
      setElementText(el, vnode.children);
    } else if (Array.isArray(vnode.children)) {
      vnode.children.forEach(child => {
        patch(null, child, el);
      });
    }
    if (vnode.transition) {
      vnode.transition.beforeEnter(el);
    }
    insert(el, container, anchor);
    if (vnode.transition) {
      vnode.transition.enter(el);
    }
  }

  return { render };
}

/**
 * @description ??????prop???????????????DOMProperties
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
    // ????????????????????????????????????????????????????????????????????????????????????
    // ???????????????????????????????????????????????????removeEventListener
    const invokers: any = el._vei || (el._vei = {});
    let invoker = invokers[eventName];
    if (nextVal) {
      if (invoker) {
        invoker.value = nextVal;
        invoker.attached = performance.now();
      } else {
        invokers[eventName] = invoker = (e: any) => {
          // ????????????attached??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
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
    // ?????????type??????DOMProperties??????????????????
    const type = typeof el[prop];
    if (type === 'boolean' && nextVal === '') {
      el[prop] = true;
    } else {
      el[prop] = nextVal;
    }
  } else {
    // ??????????????????DOMProperties,?????????HTMLAttributes
    el.setAttribute(prop, nextVal);
  }
}

function unmount(vnode: VNode) {
  vnode = vnode.component?.subTree ?? vnode;
  if (vnode.type === FRAGMENT_NODE) {
    if (Array.isArray(vnode.children)) {
      vnode.children.forEach(child => {
        unmount(child);
      });
    }
  } else {
    const isComponent = isObject(vnode.type);
    if (vnode.shouldKeepAlive) {
      // ?????????keepAlive???????????????????????????????????????
      vnode.keepAliveInstance?._deActivate!(vnode);
    } else if (isComponent && (vnode.type as Component).__isTeleport) {
      // ???????????????array
      if (Array.isArray(vnode.children)) {
        vnode.children.forEach(child => {
          unmount(child);
        });
      }
    } else {
      isComponent && vnode.component!.beforeUnmount.forEach(cb => cb());

      function performRemove() {
        vnode.el?.parentNode?.removeChild(vnode.el);
      }

      if (vnode.transition) {
        vnode.transition.leave(vnode.el! as any, performRemove);
      } else {
        performRemove();
      }
      isComponent && vnode.component!.unmounted.forEach(cb => cb());
    }
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
