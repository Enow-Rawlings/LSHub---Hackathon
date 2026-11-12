import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// GoogleOAuthProvider is no longer needed - GoogleButton uses the native
// Google Identity Services (GSI) script loaded at runtime.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
