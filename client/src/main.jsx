import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Only wrap with GoogleOAuthProvider when a client ID is actually configured.
// Without it the provider throws on mount and blank-pages the whole app.
async function mount() {
  const root = ReactDOM.createRoot(document.getElementById('root'));

  if (GOOGLE_CLIENT_ID) {
    const { GoogleOAuthProvider } = await import('@react-oauth/google');
    root.render(
      <React.StrictMode>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <App />
        </GoogleOAuthProvider>
      </React.StrictMode>
    );
  } else {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}

mount();
