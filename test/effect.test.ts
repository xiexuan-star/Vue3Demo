import { effect, reactive } from '../reactivity';

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
