import { effect, ref } from '../../reactivity';
import { COMMENT_NODE, FRAGMENT_NODE, renderer, TEXT_NODE, VNode } from '../../renderer';

const { render } = renderer;
const currentVal = ref('init');
const listLen = ref(0);
const alert = ref(false);
const onBtnClick = (e: any) => {
  alert.value = true;
};
effect(() => {
  const nodes: VNode = {
    type: 'h1', props: {
      id: 'foo',
      style: {
        display: 'flex',
        'justify-content': 'center',
        flexDirection: 'column',
        width: '200px'
      },
      onClick: alert.value ? (e: any) => {
        console.log(e);
      } : null
    }, children: [
      { type: 'article', children: currentVal.value },
      { type: 'nav', children: 'this is a nav' },
      {
        type: 'input',
        props: { value: 'bar', disabled: '' }
      },
      {
        type: 'button', props: {
          onClick: onBtnClick
        },
        children: 'clickme'
      },
      { type: TEXT_NODE, children: 'text' },
      { type: COMMENT_NODE, children: 'comment' },
      { type: 'br' },
      {
        type: FRAGMENT_NODE, children: [
          { type: COMMENT_NODE, children: 'fragment comment' },
          { type: TEXT_NODE, children: 'fragment' },
        ]
      },
      {
        type: 'input',
        props: {
          value: currentVal.value,
          onInput(e: any) {
            currentVal.value = e.target.value;
            console.log(e.target.value);
          },
          class: ['class1 class2', { class3: true, class4: false }]
        }
      },
      {
        type: 'button', props: {
          onClick: () => {
            listLen.value++;
          }
        },
        children: 'add'
      },
      {
        type: 'ul',
        children: Array.from({ length: listLen.value }).map((_, i) => {
          return {
            type: 'li',
            children: `item ${ i }`
          };
        })
      }
    ]
  };
  render(nodes, '#app');
});
