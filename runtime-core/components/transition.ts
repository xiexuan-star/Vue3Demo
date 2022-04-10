import { Component, VNode } from '../renderer';

function nextFrame(cb: Function) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      cb();
    });
  });
}

export default {
  name: 'Transition',
  props: {
    name: String
  },
  setup(props, { slots }) {
    return () => {
      const rawVNode: VNode = slots.default?.();
      if (!rawVNode) return rawVNode;

      function getClass(type: string, prepend = 'enter') {
        return `${ prepend }-${ type }${ props.name ? '-' + props.name : '' }`;
      }

      rawVNode.transition = {
        beforeEnter(el: HTMLElement) {
          el.classList.add(getClass('from'));
          el.classList.add(getClass('active'));
        },
        enter(el: HTMLElement) {
          nextFrame(() => {
            el.classList.remove(getClass('from'));
            el.classList.add(getClass('to'));

            function release() {
              // el.classList.remove(getClass('to'));
              el.classList.remove(getClass('active'));
              el.removeEventListener('transitionend', release);
            }

            el.addEventListener('transitionend', release);
          });
        },
        leave(el: HTMLElement, performRemove: () => void) {
          el.classList.remove(getClass('to'));
          el.classList.add(getClass('from', 'leave'));
          el.classList.add(getClass('active', 'leave'));
          // force reflow
          document.body.offsetHeight;
          nextFrame(() => {
            el.classList.remove(getClass('from', 'leave'));
            el.classList.add(getClass('to', 'leave'));

            function release() {
              performRemove();
              el.removeEventListener('transitionend', release);
              el.classList.remove(getClass('active', 'leave'));
            }

            el.addEventListener('transitionend', release);
          });
        }
      };
      return rawVNode;
    };
  }
} as Component;
