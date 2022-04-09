import { COMMENT_NODE, Component, createVNode, FRAGMENT_NODE, onMounted, renderer, VNode } from '../../renderer';
import { ref, unref } from '../../reactivity';
import { defineAsyncComponent } from '../../renderer/defineAsyncComponent';
import KeepAlive from '../../renderer/keepAlive';

const { render } = renderer;
const AsyncComponent = defineAsyncComponent({
  loader(): Promise<Component> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        Math.random() > 0.4 ? resolve({
          render() {
            return createVNode(FRAGMENT_NODE, null, [
              createVNode('img', { src: 'https://lh3.googleusercontent.com/ogw/ADea4I6cDfLDVGkG3EL30V5GSJFpT7Av735C4bwiixlH=s64-c-mo' }),
              createVNode('p', null, 'hi,I\'m async component!')
            ]);
          }
        }) : reject('what\'s a pity!');
      }, 2_000);
    });
  },
  onError(err, retry, fail, retries) {
    console.log(err);
    if (retries > 3) {
      fail();
    } else {
      retry();
    }
  },
  timeout: 1_000,
  delay: 200,
  loadingComponent: {
    render() {
      return createVNode('div', null, 'loading');
    }
  },
  errComponent: {
    render() {
      return createVNode('section', null, [
        createVNode('div', null, 'ah,It\'s failed')
      ]);
    }
  }
});
const TestComponent: Component = {
  name: 'TestComponent',
  setup(props, { emit }) {
    const value = ref(0);
    onMounted(() => {
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
const nodeList1: Component = {
  name: 'nodeList1',
  render() {
    console.log('renderOldNodes!');
    return createVNode(FRAGMENT_NODE, null, [
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
    ]);
  }
};
const nodeList2: Component = {
  name: 'nodeList2',
  render() {
    console.log('renderNewNodes!');
    return createVNode(FRAGMENT_NODE, null, [
      createVNode('h1', { key: 0 }, 'h1'),
      createVNode('h3', { key: 2 }, 'h3'),
      createVNode('h2', { key: 1 }, 'h2'),
      createVNode('h4', { key: 3 }, 'h4'),
      createVNode(() => {
        return createVNode('h5', { key: 4 }, [
          createVNode('p', { key: 0 }, 'paragraph1'),
          createVNode('p', { key: 1 }, 'paragraph2')
        ]);
      })
    ]);
  }
};
const nodeList3: Component = {
  name: 'nodeList3',
  setup() {
    return () => {
      console.log('renderNodesList3');
      const value = ref('');
      return createVNode(FRAGMENT_NODE, null, [
        createVNode('input', {
          value: unref(value), onInput(event: any) {
            value.value = event.target.value;
            console.log(value);
          }
        })
      ]);
    };
  },
};
const App: Component = {
  name: 'App',
  setup() {
    const toggleList = ref(0);
    return { toggleList };
  },
  render(context: any): VNode {
    return createVNode('section', null, [
      createVNode('button', {
        onClick() {
          context.toggleList = 0;
        },
        key: 0
      }, 'change to 0!'),
      createVNode('button', {
        onClick() {
          context.toggleList = 1;
        },
        key: 1
      }, 'change to 1!'),
      createVNode('button', {
        onClick() {
          context.toggleList = 2;
        },
        key: 2
      }, 'change to 2!'),
      createVNode('section', {
        key: 3
      }, [
        createVNode(KeepAlive, { key: 0, max: 2 },
          {
            default() {
              return [createVNode(nodeList1), createVNode(nodeList2), createVNode(nodeList3)][context.toggleList];
            }
          })
      ])
    ]);
  }
};
render({ type: App }, '#app');
