import { COMMENT_NODE, Component, createVNode, onMounted, renderer, VNode } from '../../renderer';
import { ref } from '../../reactivity';
import { defineAsyncComponent } from '../../renderer/defineAsyncComponent';

const { render } = renderer;
const toggleList = ref(false);
const AsyncComponent = defineAsyncComponent({
  loader(): Promise<Component> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          render() {
            return createVNode('section', null, 'hi,I\'m async component');
          }
        });
      }, 4_000);
    });
  },
  timeout: 2_000,
  delay: 500,
  loadingComponent: {
    render() {
      return createVNode('div', null, 'loading');
    }
  },
  errComponent: {
    render() {
      return createVNode('img', { src: 'https://lh3.googleusercontent.com/ogw/ADea4I6cDfLDVGkG3EL30V5GSJFpT7Av735C4bwiixlH=s64-c-mo' });
    }
  }
});
const TestComponent: Component = {
  name: 'TestComponent',
  setup(props, { emit }) {
    const value = ref(0);
    onMounted(() => {
      console.log('mounted!!');
      value.value++;
    });
    return {
      update() {emit('click', 1, 2, 3);},
      value
    };
  },
  render(this: any, context: any): VNode {
    return createVNode('section', null, [
      {
        type: 'button', props: {
          onClick(this: any) {
            context.value++;
            context.update();
          }
        }, children: 'click'
      },
      this.$slots.default?.() ?? { type: COMMENT_NODE, children: 'comment' },
      { type: 'h1', children: this.value + '' },
      { type: AsyncComponent }

    ]);
  }
};
const oldNodes = [
  createVNode('h1', { key: 0 }, 'h1'),
  createVNode('h2', { key: 1 }, 'h2'),
  createVNode('h3', { key: 2 }, 'h3'),
  createVNode(TestComponent, {
    key: 5,
    onClick(...args: any) {
      console.log('emit listener=>', args);

    }, children: {
      default() {
        return createVNode('article', null, 'I\'m slot!!');
      }
    }
  })
];
const newNodes = [
  createVNode('h1', { key: 0 }, 'h1'),
  createVNode('h3', { key: 2 }, 'h3'),
  createVNode('h2', { key: 1 }, 'h2'),
  createVNode('h4', { key: 3 }, 'h4')
];
const App: Component = {
  name: 'App',
  data() {
    return {};
  },
  render(context: any): VNode {
    return createVNode('section', null, [
      {
        type: 'button', props: {
          onClick() {
            toggleList.value = !toggleList.value;
          }
        },
        key: 0,
        children: 'clickme!'
      },
      {
        type: 'ul',
        key: 1,
        children: toggleList.value ? newNodes : oldNodes
      }
    ]);
  }
};
render({ type: App }, '#app');
