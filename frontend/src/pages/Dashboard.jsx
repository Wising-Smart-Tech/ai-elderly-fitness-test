import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Activity, TrendingUp, ClipboardList, Play, BarChart3, LogOut, User } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-10 w-full max-w-4xl relative">
        <button
          onClick={handleLogout}
          className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 bg-white border-2 border-red-500 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-all"
        >
          <LogOut className="w-4 h-4" />
          登出
        </button>
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full mb-4">
            <Activity className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            歡迎回來，{user?.name || '使用者'}！
          </h1>
          <p className="text-gray-600">
            準備好進行今天的體適能測試了嗎？
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-100 hover:shadow-lg transition-all">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-lg flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">高齡體適能檢測</h3>
            <p className="text-gray-600 text-sm mb-4">
              完整的體適能評估測試
            </p>
            <Link
              to="/app/test/chair-stand"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <Play className="w-4 h-4" />
              開始測試
            </Link>
          </div>

          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-lg border border-teal-100 hover:shadow-lg transition-all">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-lg flex items-center justify-center mb-4">
              <User className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">個人檔案</h3>
            <p className="text-gray-600 text-sm mb-4">
              管理您的個人資料與設定
            </p>
            <Link
              to="/app/profile"
              className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium transition-colors"
            >
              <User className="w-4 h-4" />
              查看檔案
            </Link>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-6 rounded-lg border border-cyan-100 hover:shadow-lg transition-all">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-400 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">查看成績</h3>
            <p className="text-gray-600 text-sm mb-4">
              檢視您的歷史測試記錄
            </p>
            <Link
              to="/app/results"
              className="inline-flex items-center gap-1 text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              查看記錄
            </Link>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-teal-50 p-4 rounded-lg border border-blue-100">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-400 to-teal-400 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 text-sm mb-1">今日提醒</h3>
              <p className="text-xs text-gray-600">
                建議每週進行2-3次體適能測試，以追蹤您的健康進展
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-center text-xs text-gray-500">
            © 2025 AI 高齡體適能檢測系統
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;