import { useState, useEffect, useCallback } from "react";

/**
 * Clear all persistent filter states from sessionStorage
 */
export const clearAllPersistentFilters = () => {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (
          key &&
          (key.startsWith("filter_state_") ||
            key.startsWith("filter_val_") ||
            key.startsWith("filter_") ||
            key.startsWith("student_progress_filters_") ||
            key.includes("_filter") ||
            key.includes("_search"))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
    }
  } catch (e) {
    console.warn("[clearAllPersistentFilters] Error:", e);
  }
};

/**
 * On page reload / refresh, immediately clear persistent filters
 * so the page starts clean with no leftover search or filters.
 */
let isReloadPurged = false;
export const purgeFiltersOnPageReload = () => {
  if (isReloadPurged) return;
  isReloadPurged = true;
  try {
    if (typeof window === "undefined") return;
    const navEntries = performance.getEntriesByType?.("navigation");
    const isReloadLevel2 = navEntries && navEntries.length > 0 && navEntries[0].type === "reload";
    const isReloadLevel1 = window.performance?.navigation?.type === 1;

    if (isReloadLevel2 || isReloadLevel1) {
      clearAllPersistentFilters();
    }
  } catch (e) {
    // ignore
  }
};

// Run immediately upon script import
purgeFiltersOnPageReload();

/**
 * usePersistentFilters
 * 
 * Manages an object of filter values persisted in sessionStorage.
 * Restores state on in-app route transitions.
 * Automatically clears when page is refreshed or user logs out.
 * 
 * @param {string} storageKey - Unique storage key for the page/section
 * @param {object} defaultFilters - Default filter values
 */
export function usePersistentFilters(storageKey, defaultFilters) {
  const getInitialFilters = useCallback(
    (key) => {
      try {
        const stored = sessionStorage.getItem(`filter_state_${key}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...defaultFilters, ...parsed };
        }
      } catch (e) {
        console.warn(`[usePersistentFilters] Error reading ${key}:`, e);
      }
      return defaultFilters;
    },
    [defaultFilters]
  );

  const [prevKey, setPrevKey] = useState(storageKey);
  const [filters, setFilters] = useState(() => getInitialFilters(storageKey));

  // If storageKey changes dynamically, reset state to that key's stored value before effects run
  if (prevKey !== storageKey) {
    setPrevKey(storageKey);
    setFilters(getInitialFilters(storageKey));
  }

  // Sync state to sessionStorage whenever filters change
  useEffect(() => {
    try {
      sessionStorage.setItem(`filter_state_${storageKey}`, JSON.stringify(filters));
    } catch (e) {
      console.warn(`[usePersistentFilters] Error writing ${storageKey}:`, e);
    }
  }, [storageKey, filters]);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const updateFilters = useCallback((updates) => {
    setFilters((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const resetFilter = useCallback(
    (key) => {
      setFilters((prev) => ({
        ...prev,
        [key]: defaultFilters[key] !== undefined ? defaultFilters[key] : "",
      }));
    },
    [defaultFilters]
  );

  const resetAllFilters = useCallback(() => {
    setFilters(defaultFilters);
    try {
      sessionStorage.removeItem(`filter_state_${storageKey}`);
    } catch (e) {
      console.warn(`[usePersistentFilters] Error clearing ${storageKey}:`, e);
    }
  }, [storageKey, defaultFilters]);

  return {
    filters,
    setFilters,
    updateFilter,
    updateFilters,
    resetFilter,
    resetAllFilters,
  };
}

/**
 * usePersistentState
 * 
 * Simple persistent state for a single primitive or array value in sessionStorage.
 */
export function usePersistentState(storageKey, defaultValue) {
  const readFromStorage = useCallback(
    (key) => {
      try {
        const stored = sessionStorage.getItem(`filter_val_${key}`);
        if (stored !== null) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.warn(`[usePersistentState] Error reading ${key}:`, e);
      }
      return typeof defaultValue === "function" ? defaultValue() : defaultValue;
    },
    [defaultValue]
  );

  const [prevKey, setPrevKey] = useState(storageKey);
  const [state, setState] = useState(() => readFromStorage(storageKey));

  // If storageKey changes dynamically, reset state to that key's stored value before effects run
  if (prevKey !== storageKey) {
    setPrevKey(storageKey);
    setState(readFromStorage(storageKey));
  }

  useEffect(() => {
    try {
      sessionStorage.setItem(`filter_val_${storageKey}`, JSON.stringify(state));
    } catch (e) {
      console.warn(`[usePersistentState] Error writing ${storageKey}:`, e);
    }
  }, [storageKey, state]);

  const resetState = useCallback(() => {
    const val = typeof defaultValue === "function" ? defaultValue() : defaultValue;
    setState(val);
    try {
      sessionStorage.removeItem(`filter_val_${storageKey}`);
    } catch (e) {
      console.warn(`[usePersistentState] Error clearing ${storageKey}:`, e);
    }
  }, [storageKey, defaultValue]);

  return [state, setState, resetState];
}
