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
