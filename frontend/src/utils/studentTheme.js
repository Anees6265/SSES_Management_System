import { useState, useEffect, useCallback } from "react";

export const STUDENT_THEME_STORAGE_KEY = "student_color_scheme";
const THEME_EVENT = "student-theme-change";

const getMetaEl = () => document.querySelector('meta[name="color-scheme"]');

export const getSystemColorScheme = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const getStoredStudentScheme = () => {
  try {
    const val = localStorage.getItem(STUDENT_THEME_STORAGE_KEY);
    return val === "light" || val === "dark" ? val : null;
  } catch {
    return null;
  }
};

export const applyStudentPortalTheme = (override = getStoredStudentScheme()) => {
  if (typeof document === "undefined") return "light";
  const root = document.documentElement;
  const validOverride = override === "light" || override === "dark" ? override : null;
  const resolved = validOverride || getSystemColorScheme();

  root.dataset.studentPortal = "true";
  root.dataset.studentTheme = resolved;
  root.classList.toggle("student-dark", resolved === "dark");

  const meta = getMetaEl();
  if (meta) {
    meta.setAttribute("content", validOverride || "light dark");
  }

  return resolved;
};

export const resetStudentPortalTheme = () => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  delete root.dataset.studentPortal;
  delete root.dataset.studentTheme;
  root.classList.remove("student-dark");

  const meta = getMetaEl();
  if (meta) {
    meta.setAttribute("content", "light");
  }
};

const emitThemeChange = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(THEME_EVENT));
  }
};

/**
 * React hook for Student Portal light/dark/system color scheme.
 * Respects system `prefers-color-scheme` by default and persists explicit user overrides.
 */
export function useStudentTheme() {
  const [preference, setPreferenceState] = useState(() => getStoredStudentScheme() || "system");
  const [systemScheme, setSystemScheme] = useState(() => getSystemColorScheme());

  const resolvedTheme = preference === "system" ? systemScheme : preference;
  const isDark = resolvedTheme === "dark";

  const syncFromStorage = useCallback(() => {
    const stored = getStoredStudentScheme();
    const sys = getSystemColorScheme();
    setSystemScheme(sys);
    setPreferenceState(stored || "system");
    applyStudentPortalTheme(stored);
  }, []);

  useEffect(() => {
    applyStudentPortalTheme(getStoredStudentScheme());

    const mql = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;

    const handleSystemChange = (e) => {
      const nextSys = e.matches ? "dark" : "light";
      setSystemScheme(nextSys);
      // Do NOT remove stored override when OS changes to match it; just re-apply current override/system
      applyStudentPortalTheme(getStoredStudentScheme());
    };

    const handleStorage = (e) => {
      if (!e.key || e.key === STUDENT_THEME_STORAGE_KEY) {
        syncFromStorage();
      }
    };

    const handleLocalEvent = () => {
      syncFromStorage();
    };

    mql?.addEventListener("change", handleSystemChange);
    window.addEventListener("storage", handleStorage);
    window.addEventListener(THEME_EVENT, handleLocalEvent);

    return () => {
      mql?.removeEventListener("change", handleSystemChange);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(THEME_EVENT, handleLocalEvent);
    };
  }, [syncFromStorage]);

  // Two-state toggle for persistent header control:
  // Switches to the opposite of currently rendered scheme; clears stored override when matching system.
  const toggleTheme = useCallback(() => {
    const currentSys = getSystemColorScheme();
    const currentStored = getStoredStudentScheme();
    const currentRendered = currentStored || currentSys;
    const target = currentRendered === "dark" ? "light" : "dark";

    try {
      if (target !== currentSys) {
        localStorage.setItem(STUDENT_THEME_STORAGE_KEY, target);
      } else {
        localStorage.removeItem(STUDENT_THEME_STORAGE_KEY);
      }
    } catch {
      // Storage unavailable; still apply directly in-memory
      applyStudentPortalTheme(target);
      setPreferenceState(target);
      emitThemeChange();
      return;
    }

    syncFromStorage();
    emitThemeChange();
  }, [syncFromStorage]);

  // Explicit 3-state selector ("light" | "dark" | "system") for Profile settings
  const setThemePreference = useCallback(
    (nextPref) => {
      const valid = nextPref === "light" || nextPref === "dark" ? nextPref : "system";
      try {
        if (valid === "system") {
          localStorage.removeItem(STUDENT_THEME_STORAGE_KEY);
        } else {
          localStorage.setItem(STUDENT_THEME_STORAGE_KEY, valid);
        }
      } catch {
        applyStudentPortalTheme(valid === "system" ? null : valid);
        setPreferenceState(valid);
        emitThemeChange();
        return;
      }

      syncFromStorage();
      emitThemeChange();
    },
    [syncFromStorage]
  );

  return {
    preference,      // "system" | "light" | "dark"
    systemScheme,    // "light" | "dark"
    resolvedTheme,   // "light" | "dark"
    isDark,
    toggleTheme,
    setThemePreference,
  };
}

