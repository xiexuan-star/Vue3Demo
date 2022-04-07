import { effect, ref } from '../../reactivity';
import { COMMENT_NODE, Component, FRAGMENT_NODE, renderer, TEXT_NODE, VNode } from '../../renderer';

const { render } = renderer;
const currentVal = ref('init');
const toggleList = ref(false);
const alert = ref(false);
const onBtnClick = (e: any) => {
  alert.value = true;
};
const TestComponent: Component = {
  name: 'TestComponent',
  data() {
    return { value: 0 };
  },
  mounted(this: any) {
    this.value++;
  },
  render(this: any, context: any): VNode {
    return {
      type: 'section',
      children: [
        {
          type: 'button', props: {
            onClick(this: any) {
              context.value++;
            }
          }, children: 'click'
        },
        { type: 'h1', children: this.value + '' }
      ]
    };
  }
};
const oldNodes = [
  { type: 'h1', key: 0, children: 'h1' },
  { type: 'h2', key: 1, children: 'h2' },
  { type: 'h3', key: 2, children: 'h3' },
  { type: TestComponent, key: 5 }
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
