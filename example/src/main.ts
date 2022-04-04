import { effect, ref } from '../../reactivity';
import { renderer, VNode } from '../../renderer/render';

const { render } = renderer;
const currentVal = ref(4);
const alert = ref(false);
effect(() => {
  const nodes: VNode = {
    type: 'h1', props: {
      id: 'foo', onClick: alert.value ? (e: any) => {
        console.log(e);
      } : null
    }, children: [
      { type: 'article', children: currentVal.value },
      { type: 'nav', children: 'this is a nav' },
      {
        type: 'input',
        props: { value: 'bar', class: ['class1 class2', { class3: true, class4: false }], disabled: '' }
      },
      { type: 'br' },
      {
        type: 'button', props: {
          onClick(e: any) {
            alert.value = true;
          }
        },
        children: 'clickme'
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
    ]
  };
  render(nodes, '#app');
});
