import { Buffer } from "buffer";
window.Buffer = window.Buffer || Buffer;
window.global = window.global || window;

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { store } from "./redux/store.js";
import App from "./App.jsx";
import { Provider } from "react-redux";
import { HelmetProvider } from "react-helmet-async";

// Apply saved theme on load
const savedTheme = localStorage.getItem('theme') || 'orange';
document.documentElement.setAttribute('data-theme', savedTheme);

// Clear persistent filters on browser page reload / refresh
try {
  const navEntries = performance.getEntriesByType?.("navigation");
  const isReload =
    (navEntries && navEntries.length > 0 && navEntries[0].type === "reload") ||
    (window.performance && window.performance.navigation && window.performance.navigation.type === 1);

  if (isReload && window.sessionStorage) {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (
        key &&
        (key.startsWith("filter_") ||
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
  // ignore
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element not found!');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <HelmetProvider>
      <Provider store={store}>
        <App />
      </Provider>
    </HelmetProvider>
  </React.StrictMode>
);
