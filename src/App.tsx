import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppErrorBoundary from './components/AppErrorBoundary';
import AppRoutes from './routes/AppRoutes';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppErrorBoundary>
          <AppRoutes />
        </AppErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
