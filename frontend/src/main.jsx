import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.jsx';
import { ScanProvider } from './context/ScanContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ScanProvider>
        <App />
      </ScanProvider>
    </AuthProvider>
  </React.StrictMode>
);
