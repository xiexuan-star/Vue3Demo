import { effect, ref } from '../../reactivity';
import { COMMENT_NODE, FRAGMENT_NODE, renderer, TEXT_NODE, VNode } from '../../renderer';

const { render } = renderer;
const currentVal = ref('init');
const toggleList = ref(false);
const alert = ref(false);
const onBtnClick = (e: any) => {
  alert.value = true;
};
const oldNodes = [
  { type: 'h1', key: 0, children: 'h1' },
  { type: 'h2', key: 1, children: 'h2' },
  { type: 'h3', key: 2, children: 'h3' },
];
const newNodes = [
  { type: 'h1', key: 0, children: 'h1' },
  { type: 'h3', key: 2, children: 'h3' },
  { type: 'h2', key: 1, children: 'h2' },
  { type: 'h4', key: 3, children: 'h4' }
];
effect(() => {
  const nodes: VNode = {
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
  render(nodes, '#app');
});
