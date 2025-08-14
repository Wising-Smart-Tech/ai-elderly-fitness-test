import { Link } from 'react-router-dom';
import { Activity, Camera, Zap, Shield, LogIn, UserPlus } from 'lucide-react';

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full mb-4">
            <Activity className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            AI 高齡體適能檢測
          </h1>
          <p className="text-gray-600">
            為長者提供專業的智能健康評估
          </p>
        </div>
        
        <div className="space-y-3 mb-8">
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-lg flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-800 text-sm">AI 偵測技術</h3>
              <p className="text-xs text-gray-600">精準動作偵測與分析</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-teal-50 rounded-lg">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-800 text-sm">即時回饋</h3>
              <p className="text-xs text-gray-600">立即獲得測試結果</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-cyan-50 rounded-lg">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-400 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-800 text-sm">醫療標準</h3>
              <p className="text-xs text-gray-600">符合專業評估規範</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all transform hover:scale-[1.02] no-underline shadow-lg"
          >
            <LogIn className="w-4 h-4" />
            登入系統
          </Link>
          <Link
            to="/register"
            className="flex items-center justify-center gap-2 w-full bg-white border-2 border-teal-500 text-teal-600 py-3 rounded-lg font-medium hover:bg-teal-50 transition-all no-underline"
          >
            <UserPlus className="w-4 h-4" />
            建立新帳號
          </Link>
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

export default Home;