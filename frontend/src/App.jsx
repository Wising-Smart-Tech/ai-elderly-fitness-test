// src/App.jsx
import React from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { TestProvider } from './contexts/TestContext';

// Components
import PrivateRoute from './components/PrivateRoute.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Pages
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import TestPage from './pages/TestPage.jsx';
import Results from './pages/Results.jsx';
import Profile from './pages/Profile.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

// Styles
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Layout wrapper component
function Layout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Outlet />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  );
}

// Create router with future flags enabled
const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Layout />,
      children: [
        {
          index: true,
          element: <Home />
        },
        {
          path: "login",
          element: <Login />
        },
        {
          path: "register",
          element: <Register />
        },
        {
          path: "dashboard",
          element: <ProtectedRoute allowedRoles={['elderly_user']}><Dashboard /></ProtectedRoute>
        },
        {
          path: "app",
          element: <PrivateRoute><Dashboard /></PrivateRoute>
        },
        {
          path: "app/test/chair-stand",
          element: <PrivateRoute><TestPage /></PrivateRoute>
        },
        {
          path: "app/results",
          element: <PrivateRoute><Results /></PrivateRoute>
        },
        {
          path: "app/profile",
          element: <PrivateRoute><Profile /></PrivateRoute>
        },
        {
          path: "admin",
          element: <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
        }
      ]
    }
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }
  }
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TestProvider>
          <RouterProvider router={router} />
        </TestProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;