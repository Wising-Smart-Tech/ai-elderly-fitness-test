// src/pages/Login.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const { login, isLoading, error, clearError, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Clear any previous errors when component mounts
    clearError();
  }, [clearError]); // Empty dependency array to run only once on mount

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated && user) {
      const redirectTo = user.role === 'admin' ? '/admin' : '/dashboard';
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      return;
    }

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      // Navigation is handled by the useEffect above
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">歡迎回來</h3>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="電子郵件"
            required
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="密碼"
            required
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <LogIn className="w-4 h-4" />
              {isLoading ? '登入中...' : '登入'}
            </button>
            <Link
              to="/"
              className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-teal-500 text-teal-600 py-2 rounded-lg font-medium hover:bg-teal-50 transition-all no-underline"
            >
              <X className="w-4 h-4" />
              取消
            </Link>
          </div>

          <div className="text-center pt-2">
            <span className="text-gray-600 text-sm">
              還沒有帳戶？{' '}
            </span>
            <Link 
              to="/register" 
              className="text-cyan-600 hover:text-cyan-700 text-sm no-underline"
            >
              立即註冊
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;