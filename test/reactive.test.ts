import { computed, effect, reactive, watch } from '../reactive';

test('reactive', () => {
  const obj = reactive({ a: 1, ok: true });
  let value = obj.a;
  let triggerNum = 0;
  effect(() => {
    triggerNum++;
    value = obj.ok ? obj.a : 999999;
  });
  expect(triggerNum).toBe(1);
  expect(value).toBe(1);
  obj.a = 2;
  expect(triggerNum).toBe(2);
  expect(value).toBe(2);
  obj.ok = false;
  expect(triggerNum).toBe(3);
  obj.a = 100;
  expect(triggerNum).toBe(3);
});

test('effect in operation', () => {
  const obj = reactive({ a: 1, ok: true });
  let triggerNum = 0;
  effect(() => {
    const a = 'a' in obj;
    triggerNum++;
  });
  expect(triggerNum).toBe(1);
  obj.a++;
  expect(triggerNum).toBe(2);
});

test('effect for in loop', () => {
  const obj = reactive({ a: 1, ok: true });
  let triggerNum = 0;
  effect(() => {
    for (const key in obj) {
      //
    }
    triggerNum++;
  });
  expect(triggerNum).toBe(1);
  Reflect.set(obj, 'c', 4);
  expect(triggerNum).toBe(2);
  obj.a++;
  expect(triggerNum).toBe(2);
  Reflect.deleteProperty(obj, 'ok');
  expect(triggerNum).toBe(3);
});

test('effect nested', () => {
  const obj = reactive({ a: 1, b: 2 });
  let effect1Num = 0, effect2Num = 0;
  effect(() => {
    effect1Num++;
    effect(() => {
      effect2Num++;
      obj.b++;
    });
    obj.a++;
  });
  expect([effect1Num, effect2Num]).toStrictEqual([1, 1]);
  obj.a++;
  expect([effect1Num, effect2Num]).toStrictEqual([2, 3]);
  obj.b++;
  expect([effect1Num, effect2Num]).toStrictEqual([2, 7]);
});

test('effect scheduler', async () => {
  const obj = reactive({ a: 1 });
  let i = 0;

  effect(() => {
    const a = obj.a;
    i++;
  }, {
    scheduler(f: Function) {
      setTimeout(() => {
        f();
      });
    }
  });
  expect(i).toBe(1);
  obj.a++;
  obj.a++;
  expect(i).toBe(1);
  await new Promise(resolve => {
    setTimeout(() => {
      resolve(void 0);
    });
  });
  expect(i).toBe(3);
});

test('effect lazy', () => {
  const obj = reactive({ a: 1 });
  let i = 0;
  const _run = effect(() => {
    i++;
    const a = obj.a;
  }, { lazy: true });
  expect(i).toBe(0);
  _run();
  expect(i).toBe(1);
  obj.a++;
  expect(i).toBe(2);
});
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
