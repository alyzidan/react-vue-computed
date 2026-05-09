import { useRef, useState, useSyncExternalStore, useCallback } from 'react';
import { ComputedImpl } from './computed';

type WritableConfig<T> = { get: () => T; set: (value: T) => void };

export function useComputed<T>(getter: () => T): T;
export function useComputed<T>(config: WritableConfig<T>): [T, (value: T) => void];

export function useComputed<T>(
  arg: (() => T) | WritableConfig<T>
): T | [T, (value: T) => void] {
  const isWritable = typeof arg !== 'function';

  const getterRef = useRef<() => T>(isWritable ? arg.get : arg);
  const setterRef = useRef<((v: T) => void) | null>(isWritable ? arg.set : null);

  getterRef.current = isWritable ? arg.get : arg;
  setterRef.current = isWritable ? arg.set : null;

  const [computed] = useState(() => new ComputedImpl<T>(() => getterRef.current()));

  const subscribe = useCallback((cb: () => void) => computed.subscribe(cb), [computed]);
  const getSnapshot = useCallback(() => computed.value, [computed]);

  const setValue = useCallback((v: T) => {
    setterRef.current?.(v);
  }, []);

  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return isWritable ? [value, setValue] : value;
}
