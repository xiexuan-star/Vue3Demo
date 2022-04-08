import { ref } from '../../reactivity';
import { COMMENT_NODE, Component, onMounted, renderer, VNode } from '../../renderer';

const { render } = renderer;
const toggleList = ref(false);
const alert = ref(false);
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
    return {
      type: 'section',
      children: [
        {
          type: 'button', props: {
            onClick(this: any) {
              context.value++;
              context.update();
            }
          }, children: 'click'
        },
        this.$slots.default?.() ?? { type: COMMENT_NODE, children: 'comment' },
        { type: 'h1', children: this.value + '' }
      ]
    };
  }
};
const oldNodes = [
  { type: 'h1', key: 0, children: 'h1' },
  { type: 'h2', key: 1, children: 'h2' },
  { type: 'h3', key: 2, children: 'h3' },
  {
    type: TestComponent, props: {
      onClick(...args: any) {
        console.log('emit listener=>', args);
      }
    }, children: {
      default() {
        return { type: 'article', children: 'I\'m slot!!' };
      }
    }, key: 5
  }
];
const newNodes = [
  { type: 'h1', key: 0, children: 'h1' },
  { type: 'h3', key: 2, children: 'h3' },
  { type: 'h2', key: 1, children: 'h2' },
  { type: 'h4', key: 3, children: 'h4' }
];
const App: Component = {
  name: 'App',
  data() {
    return {};
  },
  render(context: any): VNode {
    return {
      type: 'section',
      children: [
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
      ]
    };
  }
};
render({ type: App }, '#app');
