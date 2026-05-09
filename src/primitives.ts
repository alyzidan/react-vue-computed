import { track, trigger, type Effect } from './core';

export interface Ref<T> { value: T }

export function ref<T>(initial: T): Ref<T> {
  const dep = new Set<Effect>();
  let value = initial;
  return {
    get value() {
      track(dep);
      return value;
    },
    set value(next: T) {
      if (Object.is(value, next)) return;
      value = next;
      trigger(dep);
    },
  };
}

const reactiveCache = new WeakMap<object, object>();

export function reactive<T extends object>(target: T): T {
  const cached = reactiveCache.get(target);
  if (cached) return cached as T;

  const depMap = new Map<string | symbol, Set<Effect>>();
  
  const getDep = (key: string | symbol) => {
    let dep = depMap.get(key);
    if (!dep) { dep = new Set(); depMap.set(key, dep); }
    return dep;
  };

  const proxy = new Proxy(target, {
    get(obj, key, receiver) {
      track(getDep(key));
      const v = Reflect.get(obj, key, receiver);
      return typeof v === 'object' && v !== null ? reactive(v) : v;
    },
    set(obj, key, value, receiver) {
      const old = Reflect.get(obj, key, receiver);
      const result = Reflect.set(obj, key, value, receiver);
      if (!Object.is(old, value)) trigger(getDep(key));
      return result;
    },
  }) as T;

  reactiveCache.set(target, proxy);
  return proxy;
}