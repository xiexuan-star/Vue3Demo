import { isArray } from '../../shared';
import { Component, VNode } from '../renderer';

export default {
  name: 'Teleport',
  __isTeleport: true,
  props: {
    to: String
  },
  process(n1, n2, container, anchor, { patch, patchKeyedChildren, move, unmount }) {
    if (!n1) {
      const to = n2.props!.to;
      const target = document.querySelector(to);
      n2.el = target;
      if (!target) return console.log(`Can't find element by selector ${ to }`);
      // n2的children有很多情况，此处只考虑array
      (n2.children as Array<VNode>).forEach(vnode => {
        patch(null, vnode, target, anchor);
      });
    } else {
      const oldTo = n1.props!.to;
      const newTo = n2.props!.to;
      const target = document.querySelector(newTo);
      if (!target) return console.log(`Can't find element by selector ${ newTo }`);
      if (oldTo === newTo) {
        patchKeyedChildren(n1, n2, target);
      } else {
        (n1.children as Array<VNode>).forEach(vnode => {
          move(vnode, target, anchor);
        });
      }
      n2.el = target;
    }
  },
  move(vnode, container, anchor, { move }) {
    if (isArray(vnode.children)) {
      vnode.children.forEach(child => {
        move(child, vnode.el, anchor);
      });
    }
  },
  setup(props, { slots }) {
    return () => {
      return slots.default?.();
    };
  }
} as Component;
