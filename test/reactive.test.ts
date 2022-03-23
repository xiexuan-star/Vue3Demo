import { computed, effect, reactive, readonly, shallowReactive, shallowReadOnly, watch } from '../reactive';

test('shallow reactive', () => {
  const a = shallowReactive({
    b: {
      c: 3
    }
  });
  let effectNum = 0;
  effect(() => {
    effectNum++;
    a.b.c;
  });
  expect(effectNum).toBe(1);
  a.b.c++;
  expect(effectNum).toBe(1);
});

test('deep reactive', () => {
  const a = reactive({
    b: {
      c: 3
    }
  });
  let effectNum = 0;
  effect(() => {
    effectNum++;
    a.b.c;
  });
  expect(effectNum).toBe(1);
  a.b.c++;
  expect(effectNum).toBe(2);
});
test('readonly', () => {
  const a = readonly({
    b: {
      c: 3
    }
  });
  let effectNum = 0;
  effect(() => {
    effectNum++;
    a.b.c;
  });
  expect(effectNum).toBe(1);
  a.b.c++;
  expect(effectNum).toBe(1);
  expect(a.b.c).toBe(3);
});
test('shallow readonly', () => {
  const a = shallowReadOnly({
    b: {
      c: 3
    }
  });
  let effectNum = 0;
  effect(() => {
    effectNum++;
    a.b.c;
  });
  expect(effectNum).toBe(1);
  a.b.c++;
  expect(effectNum).toBe(1);
  expect(a.b.c).toBe(4);
});

test('reactive cleanup', () => {
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
  obj.a = 2;
  expect(triggerNum).toBe(2);
  expect(value).toBe(2);
  obj.a = 2;
  obj.ok = false;
  expect(triggerNum).toBe(3);
  obj.a = 100;
  expect(triggerNum).toBe(3);
});

test('array reactive of length', () => {
  const arr = reactive([1, 2, 3]);
  let effectNum = 0;
  effect(() => {
    effectNum++;
    arr.length;
  });
  expect(effectNum).toBe(1);
  arr.push(4);
  expect(effectNum).toBe(2);
});
test('array reactive of set', () => {
  const arr = reactive([1, 2, 3]);
  let effectNum1 = 0, effectNum2 = 0;
  effect(() => {
    effectNum1++;
    arr[0];
  });
  effect(() => {
    effectNum2++;
    arr[1];
  });
  expect(effectNum1).toBe(1);
  expect(effectNum2).toBe(1);
  arr.length = 1;
  expect(effectNum1).toBe(1);
  expect(effectNum2).toBe(2);
});
test('array reactive of for...in loop', () => {
  const arr = reactive([1, 2, 3]);
  let effectNum = 0;
  effect(() => {
    effectNum++;
    for (let i in arr) {
      //
    }
  });
  expect(effectNum).toBe(1);
  arr[4] = 4;
  expect(effectNum).toBe(2);
  arr.length = 10;
  expect(effectNum).toBe(3);
});
test('array includes', () => {
  const obj = {};
  const arr = reactive([obj, 2, 3]);
  expect(arr.includes(arr[0])).toBe(true);
  expect(arr.includes(obj)).toBe(true);
  expect(arr.indexOf(arr[0])).toBe(0);
  expect(arr.indexOf(obj)).toBe(0);
  expect(arr.lastIndexOf(arr[0])).toBe(0);
  expect(arr.lastIndexOf(obj)).toBe(0);
});
test('array push', () => {
  const arr = reactive([1, 2, 3]);
  let effectNum = 0;
  effect(() => {
    arr.push(1);
    effectNum++;
  });
  effect(() => {
    arr.push(1);
    effectNum++;
  });
  expect(effectNum).toBe(2);
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
    Reflect.get(obj, 'a');
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
    Reflect.get(obj, 'a');
  }, { lazy: true });
  expect(i).toBe(0);
  _run();
  expect(i).toBe(1);
  obj.a++;
  expect(i).toBe(2);
});

test('effect prototype', () => {
  const a = reactive({ a: 1 });
  const b = reactive({ b: 2 });
  Object.setPrototypeOf(a, b);
  let effectNum = 0;
  effect(() => {
    effectNum++;
    Reflect.get(a, 'b');
  });
  expect(effectNum).toBe(1);
  Reflect.set(a, 'b', 3);
  expect(effectNum).toBe(2);
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
