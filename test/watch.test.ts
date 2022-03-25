import { reactive, watch } from '../reactivity';

test('watch', () => {
  const obj = reactive({ a: 1, b: 1 });
  let watchNum = 0;
  let newValue: number | undefined, oldValue: number | undefined;
  watch(() => obj.a, (nv, ov) => {
    watchNum++;
    newValue = nv;
    oldValue = ov;
  });
  expect([watchNum, oldValue, newValue]).toStrictEqual([0, undefined, undefined]);
  obj.a++;
  expect([watchNum, oldValue, newValue]).toStrictEqual([1, 1, 2]);
});

test('watch immediate', () => {
  const obj = reactive({ a: 1, b: 1 });
  let watchNum = 0;
  let newValue: number | undefined, oldValue: number | undefined;
  watch(() => obj.a, (nv, ov) => {
    watchNum++;
    newValue = nv;
    oldValue = ov;
  }, { immediate: true });
  expect([watchNum, oldValue, newValue]).toStrictEqual([1, undefined, 1]);
  obj.a++;
  expect([watchNum, oldValue, newValue]).toStrictEqual([2, 1, 2]);
});

test('watch flush', async () => {
  const obj = reactive({ a: 1, b: 1 });
  let watchNum = 0;
  let newValue: number | undefined, oldValue: number | undefined;
  watch(() => obj.a, (nv, ov) => {
    watchNum++;
    newValue = nv;
    oldValue = ov;
  }, { flush: 'post' });
  expect([watchNum, oldValue, newValue]).toStrictEqual([0, undefined, undefined]);
  obj.a++;
  expect([watchNum, oldValue, newValue]).toStrictEqual([0, undefined, undefined]);
  await Promise.resolve();
  expect([watchNum, oldValue, newValue]).toStrictEqual([1, 1, 2]);
});
