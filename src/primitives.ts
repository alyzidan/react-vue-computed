import { track, trigger, type Effect } from './core';

const REF_FLAG = Symbol('ref');

export interface Ref<T> {
  value: T;
}

export function ref<T>(initial: T): Ref<T> {
  const dep = new Set<Effect>();
  let value = initial;
  const r = {
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
  Object.defineProperty(r, REF_FLAG, { value: true, enumerable: false });
  return r;
}

export function isRef<T = unknown>(value: unknown): value is Ref<T> {
  return !!(value && (value as Record<symbol, unknown>)[REF_FLAG] === true);
}

export function unref<T>(value: T | Ref<T>): T {
  return isRef<T>(value) ? value.value : (value as T);
}

const rawToProxy = new WeakMap<object, object>();
const proxyToRaw = new WeakMap<object, object>();

export function reactive<T extends object>(target: T): T {
  if (proxyToRaw.has(target)) return target;
  const cached = rawToProxy.get(target);
  if (cached) return cached as T;

  const depMap = new Map<string | symbol, Set<Effect>>();

  const getDep = (key: string | symbol) => {
    let dep = depMap.get(key);
    if (!dep) {
      dep = new Set();
      depMap.set(key, dep);
    }
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
    deleteProperty(obj, key) {
      const had = Object.prototype.hasOwnProperty.call(obj, key);
      const result = Reflect.deleteProperty(obj, key);
      if (had && result) trigger(getDep(key));
      return result;
    },
  }) as T;

  rawToProxy.set(target, proxy);
  proxyToRaw.set(proxy, target);
  return proxy;
}
