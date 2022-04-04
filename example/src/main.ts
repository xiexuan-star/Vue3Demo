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
  { type: 'h1', key: 0, children: 'h11' },
  { type: 'h3', key: 2, children: 'h33' },
  { type: 'h2', key: 1, children: 'h22' },
  { type: 'h4', key: 3, children: 'h44' }
];
effect(() => {
  const nodes: VNode = {
    type: 'ul',
    children: toggleList.value ? newNodes : oldNodes
  };
  render(nodes, '#app');
});
setInterval(() => {
  toggleList.value = !toggleList.value;
}, 2_000);
