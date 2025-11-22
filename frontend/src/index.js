import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import thTH from 'antd/locale/th_TH';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Suppress findDOMNode warnings from Ant Design (known issue in antd 5.x with React 18)
// This is a temporary workaround until Ant Design fully supports React 18
const originalError = console.error;
const originalWarn = console.warn;

const shouldSuppressWarning = (message) => {
  if (typeof message !== 'string') return false;
  return (
    message.includes('findDOMNode') ||
    message.includes('Warning: findDOMNode') ||
    message.includes('findDOMNode is deprecated')
  );
};

const shouldSuppressError = (message) => {
  if (!message) return false;
  const messageStr = typeof message === 'string' ? message : String(message);
  return (
    messageStr.includes('className.split is not a function') ||
    messageStr.includes('el.className.split is not a function')
  );
};

console.error = (...args) => {
  if (shouldSuppressWarning(args[0])) {
    return; // Suppress findDOMNode warnings from Ant Design
  }
  // Suppress className.split errors (often from browser extensions or external scripts)
  if (shouldSuppressError(args[0]) || shouldSuppressError(args[1]) || shouldSuppressError(args[2])) {
    return; // Suppress className.split errors
  }
  originalError.apply(console, args);
};

console.warn = (...args) => {
  if (shouldSuppressWarning(args[0])) {
    return; // Suppress findDOMNode warnings from Ant Design
  }
  originalWarn.apply(console, args);
};

// Also suppress warnings that come through React's warning system
if (process.env.NODE_ENV === 'development') {
  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    const message = args[0];
    if (shouldSuppressWarning(message)) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
}

// Global error handler for unhandled errors (catch className.split errors from browser extensions)
window.addEventListener('error', (event) => {
  // Suppress className.split errors (often from browser extensions)
  if (event.message && shouldSuppressError(event.message)) {
    event.preventDefault();
    return false;
  }
}, true); // Use capture phase to catch errors early

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  // Suppress className.split errors in promises
  if (event.reason) {
    const reasonStr = typeof event.reason === 'string' 
      ? event.reason 
      : (event.reason?.message || String(event.reason));
    if (shouldSuppressError(reasonStr)) {
      event.preventDefault();
      return false;
    }
  }
});

// Note: StrictMode is temporarily disabled to avoid findDOMNode warnings from Ant Design
// This is a known issue in antd 5.x with React 18 StrictMode
// Will re-enable when Ant Design fully supports React 18
root.render(
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }}
  >
    <ConfigProvider
      locale={thTH}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          colorInfo: '#1677ff',
          borderRadius: 8,
          borderRadiusLG: 10,
          fontSize: 14,
          controlHeight: 36,
          colorBgContainer: '#ffffff',
        }
      }}
    >
      <App />
    </ConfigProvider>
  </BrowserRouter>
);
