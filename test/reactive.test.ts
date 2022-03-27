import { effect, reactive, readonly, shallowReactive, shallowReadOnly, stop } from '../reactivity';
import { toRaw } from '../shared';

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
test('toRaw', () => {
  const original = { foo: 1 };
  const observed = reactive(original);
  expect(toRaw(observed)).toBe(original);
  expect(toRaw(original)).toBe(original);
});

test('toRaw on object using reactive as prototype', () => {
  const original = reactive({});
  const obj = Object.create(original);
  const raw = toRaw(obj);
  expect(raw).toBe(obj);
  expect(raw).not.toBe(toRaw(original));
});
test('stop reactive', () => {
  const original = reactive({ foo: 1 });
  let bar;
  const runner = effect(() => {
    bar = original.foo;
  });
  expect(bar).toBe(1);
  original.foo++;
  expect(bar).toBe(2);
  stop(runner);
  original.foo++;
  expect(bar).toBe(2);
  runner();
  expect(bar).toBe(3);
});
test('set reactive', () => {
  const set = reactive(new Set<any>([1, 2]));
  let effectNum = 0;
  effect(() => {
    effectNum++;
    set.size;
  });
  expect(effectNum).toBe(1);
  set.delete(2);
  expect(effectNum).toBe(2);
  set.add(4);
  expect(effectNum).toBe(3);
});
test('map reactive', () => {
  const key = { key: 1 };
  const value = new Set([1, 2]);
  const map = reactive(new Map([[key, value]]));
  let effectNum = 0;
  effect(() => {
    effectNum++;
    map.forEach((v, k, m) => {
      v.size;
    });
  });
  expect(effectNum).toBe(1);
  map.get(key)!.delete(1);
  expect(effectNum).toBe(2);
  map.set(key, new Set([2, 3, 4]));
  expect(effectNum).toBe(3);
});

test('map iterator reactive', () => {
  const key = { key: 1 };
  const value = new Set([1, 2]);
  const map = reactive(new Map([[key, value]]));
  let effectNum = 0;
  effect(() => {
    effectNum++;
    for (const [key, value] of map) {
      key;
      value.size;
    }
  });
  expect(effectNum).toBe(1);
  map.get(key)!.delete(1);
  expect(effectNum).toBe(2);
  map.set(key, new Set([2, 3, 4]));
  expect(effectNum).toBe(3);
});
test('map entries reactive', () => {
  const key = { key: 1 };
  const value = new Set([1, 2]);
  const map = reactive(new Map([[key, value]]));
  let effectNum = 0;
  effect(() => {
    effectNum++;
    for (const [key, value] of map.entries()) {
      key;
      value.size;
    }
  });
  expect(effectNum).toBe(1);
  map.get(key)!.delete(1);
  expect(effectNum).toBe(2);
  map.set(key, new Set([2, 3, 4]));
  expect(effectNum).toBe(3);
});
