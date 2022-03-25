import { computed, effect, reactive } from '../reactivity';

test('computed', () => {
  const obj = reactive({ a: 1, b: 2 });
  let computeNum = 0;
  const com = computed(() => {
    computeNum++;
    return obj.a + obj.b;
  });
  let effectNum = 0;
  expect(computeNum).toBe(0);
  effect(() => {
    effectNum++;
    const a = com.value;
  });
  expect(effectNum).toBe(1);
  expect(computeNum).toBe(1);
  expect(com.value).toBe(3);
  expect(computeNum).toBe(1);
  obj.a++;
  expect(effectNum).toBe(2);
  expect(computeNum).toBe(2);
  expect(com.value).toBe(4);
  expect(computeNum).toBe(2);
});
