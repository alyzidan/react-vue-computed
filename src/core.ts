export type Effect = {
  run: () => void;
  deps: Set<Set<Effect>>;
};

export let activeEffect: Effect | null = null;

export function track(dep: Set<Effect>): void {
  if (!activeEffect) return;
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect);
    activeEffect.deps.add(dep);
  }
}

export function trigger(dep: Set<Effect>): void {
  for (const effect of [...dep]) effect.run();
}

export function cleanupEffect(effect: Effect): void {
  for (const dep of effect.deps) dep.delete(effect);
  effect.deps.clear();
}

export function runWithEffect<T>(effect: Effect, fn: () => T): T {
  cleanupEffect(effect);
  const prev = activeEffect;
  activeEffect = effect;
  try {
    return fn();
  } finally {
    activeEffect = prev;
  }
}