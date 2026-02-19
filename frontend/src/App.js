import React from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes.js';
import { Toaster } from './components/ui/sonner.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AuthProvider>
  );
}