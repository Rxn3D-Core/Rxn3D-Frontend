import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';

/**
 * A custom hook that persists state to localStorage
 * Prevents state loss on window resize or component re-mount
 *
 * @param key - The localStorage key to use
 * @param initialValue - The initial value if no persisted value exists
 * @returns [state, setState] tuple like useState
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  // Track if we've hydrated from localStorage
  const hasHydratedRef = useRef(false);

  // Initialize state from localStorage or use initialValue
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        hasHydratedRef.current = true;
        return JSON.parse(item);
      }
    } catch (error) {
      console.warn(`Error loading persisted state for key "${key}":`, error);
    }

    return initialValue;
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    // Skip the first effect if we just hydrated
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`Error persisting state for key "${key}":`, error);
    }
  }, [key, state]);

  return [state, setState];
}

/**
 * Clear a specific persisted state key from localStorage
 */
export function clearPersistedState(key: string): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error clearing persisted state for key "${key}":`, error);
    }
  }
}

/**
 * Clear all persisted state keys matching a pattern
 */
export function clearPersistedStatePattern(pattern: RegExp): void {
  if (typeof window !== 'undefined') {
    try {
      const keys = Object.keys(window.localStorage);
      keys.forEach(key => {
        if (pattern.test(key)) {
          window.localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Error clearing persisted state pattern:', error);
    }
  }
}
