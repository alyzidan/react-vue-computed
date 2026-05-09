import { type Effect, runWithEffect, cleanupEffect } from './core';

export class ComputedImpl<T> {
  private dirty = true;
  private cached!: T;
  private subs = new Set<() => void>();
  private effect: Effect;
  private running = false;

  constructor(private getter: () => T) {
    this.effect = {
      run: () => {
        if (this.running) return;
        if (this.dirty) return;
        this.dirty = true;
        this.subs.forEach((cb) => cb());
      },
      deps: new Set(),
    };
  }

  get value(): T {
    if (this.dirty) {
      this.running = true;
      try {
        runWithEffect(this.effect, () => {
          this.cached = this.getter();
        });
        this.dirty = false;
      } finally {
        this.running = false;
      }
    }
    return this.cached;
  }

  subscribe(cb: () => void): () => void {
    this.subs.add(cb);
    return () => {
      this.subs.delete(cb);
      if (this.subs.size === 0) {
        cleanupEffect(this.effect);
        this.dirty = true;
      }
    };
  }
}
