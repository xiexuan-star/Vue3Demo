import { isObject } from '../shared';
import { Component, getCurrentInstance, VNode } from './index';

export default {
  name: 'KeepAlive',
  __isKeepAlive: true,
  setup() {
    // keepAlive组件与renderer结合非常紧密，本质上是为组件打上特定的标记，然后在renderer中执行不同的逻辑
    const cache = new Map<VNode['type'], VNode>();
    const instance = getCurrentInstance();
    const { move, createElementNode } = instance?.keepAliveCtx!;
    const storageContainer = createElementNode('div');
    instance!._deActivate = (vnode) => {
      move(vnode, storageContainer);
    };
    instance!._activate = (vnode, container, anchor) => {
      move(vnode, container, anchor);
    };
    return (context: any) => {
      const slots = context.$slots;
      const rawNode: undefined | VNode = slots.default && slots.default();
      if (!isObject(rawNode)) return rawNode;
      const cacheNode = cache.get(rawNode.type);
      if (cacheNode) {
        // 如果已经有缓存了，那么便可以继承缓存vnode的component实例
        rawNode.component = cacheNode.component;
        // 打上已缓存的标记，在mountComponent时不需要真正执行挂载
        rawNode.keptAlive = true;
      } else {
        // 放入缓存
        cache.set(rawNode.type, rawNode);
      }
      // 打上shouldKeepAlive的标记，unmount时便不去真正的卸载它
      rawNode.shouldKeepAlive = true;
      rawNode.keepAliveInstance = instance!;
      return rawNode;
    };
  }
} as Component;
