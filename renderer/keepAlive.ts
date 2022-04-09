import { isObject } from '../shared';
import { Component, getCurrentInstance, VNode } from './index';

export default {
  name: 'KeepAlive',
  __isKeepAlive: true,
  props: {
    include: RegExp,
    exclude: RegExp,
    // KeepAlive采用最新一次缓存策略来管理缓存
    max: Number
  },
  setup(props, { slots }) {
    // keepAlive组件与renderer结合非常紧密，本质上是为组件打上特定的标记，然后在renderer中执行不同的逻辑
    const cache = new Map<VNode['type'], VNode>();
    // 最近一次挂载的节点，在缓存溢出时，该节点不会被修剪
    let current: null | VNode = null;
    // 用于修剪缓存,在map缓存的基础上，使用set来确保修剪缓存的顺序由先到后
    const cacheKeys = new Set<VNode['type']>();

    const instance = getCurrentInstance();
    const { move, createElementNode } = instance?.keepAliveCtx!;
    const storageContainer = createElementNode('div');
    instance!._deActivate = (vnode) => {
      move(vnode, storageContainer);
    };
    instance!._activate = (vnode, container, anchor) => {
      move(vnode, container, anchor);
    };
    return () => {
      const rawNode: undefined | VNode = slots.default && slots.default();
      if (!isObject(rawNode)) return rawNode;
      const type = rawNode.type as Component;
      const { name } = type;
      // 如果满足exclude或不满足include，则直接返回vnode
      if (name && (props.include && !props.include.test(name)) ||
          (props.exclude && props.exclude.test(name))) {
        return rawNode;
      }
      const cacheNode = cache.get(rawNode.type);
      if (cacheNode) {
        // 如果已经有缓存了，那么便可以继承缓存vnode的component实例，供move函数使用
        rawNode.component = cacheNode.component;
        // 打上已缓存的标记，在mountComponent时不需要真正执行挂载
        rawNode.keptAlive = true;
      } else {
        // 放入缓存
        cache.set(rawNode.type, rawNode);
        cacheKeys.add(rawNode.type);
        // 如果缓存溢出，那么需要修剪缓存
        if (props.max && parseInt(props.max) < cache.size) {
          const it = cacheKeys.keys();
          let res = it.next();
          while (res.value) {
            if (res.value.name !== (current!.type as Component).name && res.value.name !== (rawNode.type as Component).name) {
              cache.delete(res.value);
              cacheKeys.delete(res.value);
              break;
            } else {
              res = it.next();
            }
          }
        }
      }
      // 打上shouldKeepAlive的标记，unmount时便不去真正的卸载它
      rawNode.shouldKeepAlive = true;
      rawNode.keepAliveInstance = instance!;
      current = rawNode;
      return rawNode;
    };
  }
} as Component;
