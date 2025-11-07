'use client';

import { ToastProvider as Provider } from '../contexts/ToastContext';
import ToastContainer from './Toast';

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider>
      {children}
      <ToastContainer />
    </Provider>
  );
}

