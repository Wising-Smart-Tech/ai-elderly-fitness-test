// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  SET_USER: 'SET_USER',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,
  isAuthenticated: false
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        isLoading: false,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        error: null
      };
    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload,
        isAuthenticated: false,
        user: null,
        token: null
      };
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        error: null
      };
    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true
      };
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Configure axios defaults
  axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Validate token and get user info
      getCurrentUser();
    }
  }, []);

  const getCurrentUser = async () => {
    try {
      const response = await axios.get('/auth/me');
      dispatch({
        type: AUTH_ACTIONS.SET_USER,
        payload: response.data.user
      });
    } catch {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      toast.error('請重新登入');
    }
  };

  const login = async (email, password) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });
    
    try {
      const response = await axios.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { token, user }
      });
      
      toast.success('登入成功！');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || '登入失敗';
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData) => {
    try {
      await axios.post('/auth/register', userData);
      toast.success('註冊成功！請登入');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || '註冊失敗';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
    toast.success('已登出');
  };

  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }, []);

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/users/profile', profileData);
      dispatch({
        type: AUTH_ACTIONS.SET_USER,
        payload: response.data.user
      });
      toast.success('個人資料已更新');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || '更新失敗';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const value = useMemo(() => ({
    ...state,
    loading: state.isLoading,
    login,
    register,
    logout,
    clearError,
    updateProfile
  }), [state, login, register, logout, clearError, updateProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export { AuthProvider, useAuth };
