import React from 'react';
import ReactDOM from 'react-dom/client';
import { WrappedApp } from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Analytics } from '@vercel/analytics/react'; // NEW
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WrappedApp />
    </ErrorBoundary>
    <Analytics /> 
  </React.StrictMode>,
);