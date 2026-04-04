import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { setupPwaRegister } from './pwa-client';
import { initClientSentry, Sentry } from './sentry';
import { SentryErrorFallback } from './components/SentryErrorFallback';

setupPwaRegister();
initClientSentry();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <SentryErrorFallback error={error} resetError={resetError} />
      )}
    >
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
