import { effect } from '../reactivity';
import { ref } from '../reactivity/ref';

test('ref', () => {
  const r = ref(4);
  let num;
  effect(() => {
    num = r.value;
  });
  expect(num).toBe(4);
  r.value++;
  expect(num).toBe(5);
});
