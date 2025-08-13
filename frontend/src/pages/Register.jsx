import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Phone, Calendar, Ruler, Weight, UserPlus, X, AlertCircle, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: '',
    birthday: '',
    height: '',
    weight: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
  };

  // Validation helpers
  const isEmailValid = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isPasswordValid = (password) => {
    return password.length >= 6;
  };

  const getInputClassName = (fieldName, additionalValidation = true) => {
    const baseClass = "w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent";
    const isInvalid = touched[fieldName] && (!formData[fieldName] || !additionalValidation);
    return `${baseClass} ${isInvalid ? 'border-red-500' : 'border-gray-300'}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allFields = ['name', 'email', 'password', 'confirmPassword', 'gender', 'birthday', 'height', 'weight'];
    const newTouched = {};
    allFields.forEach(field => {
      newTouched[field] = true;
    });
    setTouched(newTouched);
    
    // Validation checks
    if (!formData.gender) {
      setError('請選擇性別');
      return;
    }
    
    if (!isEmailValid(formData.email)) {
      setError('請輸入有效的電子郵件');
      return;
    }
    
    if (!isPasswordValid(formData.password)) {
      setError('密碼至少需要6個字元');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('密碼不相符');
      return;
    }
    
    if (formData.height < 50 || formData.height > 250) {
      setError('身高需介於 50-250 公分之間');
      return;
    }
    
    if (formData.weight < 20 || formData.weight > 300) {
      setError('體重需介於 20-300 公斤之間');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || '註冊失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">建立帳戶</h3>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              name="name"
              placeholder="姓名"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              className={getInputClassName('name')}
              required
            />
          </div>
          
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              name="email"
              placeholder="電子郵件"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              className={getInputClassName('email', isEmailValid(formData.email))}
              required
            />
            {touched.email && formData.email && !isEmailValid(formData.email) && (
              <p className="text-red-500 text-xs mt-1 ml-10">請輸入有效的電子郵件</p>
            )}
          </div>
          
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="password"
              name="password"
              placeholder="密碼 (至少6個字元)"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              className={getInputClassName('password', isPasswordValid(formData.password))}
              required
            />
            {touched.password && formData.password && !isPasswordValid(formData.password) && (
              <p className="text-red-500 text-xs mt-1 ml-10">密碼至少需要6個字元</p>
            )}
          </div>
          
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="password"
              name="confirmPassword"
              placeholder="確認密碼"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              className={getInputClassName('confirmPassword', formData.confirmPassword === formData.password)}
              required
            />
            {touched.confirmPassword && formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="text-red-500 text-xs mt-1 ml-10">密碼不相符</p>
            )}
          </div>
          
          <div className="relative">
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`${getInputClassName('gender')} appearance-none ${!formData.gender ? 'text-gray-400' : 'text-black'}`}
              required
            >
              <option value="" disabled>性別</option>
              <option value="male">男</option>
              <option value="female">女</option>
            </select>
          </div>
          
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={formData.birthday || touched.birthday ? "date" : "text"}
              name="birthday"
              placeholder="生日 年/月/日"
              value={formData.birthday}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={(e) => {
                e.target.type = 'date';
                handleBlur(e);
              }}
              className={getInputClassName('birthday')}
              required
            />
          </div>
          
          <div className="relative">
            <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number"
              name="height"
              placeholder="身高 (cm)"
              value={formData.height}
              onChange={handleChange}
              onBlur={handleBlur}
              className={getInputClassName('height', formData.height >= 50 && formData.height <= 250)}
              required
              min="50"
              max="250"
            />
            {touched.height && formData.height && (formData.height < 50 || formData.height > 250) && (
              <p className="text-red-500 text-xs mt-1 ml-10">身高需介於 50-250 公分之間</p>
            )}
          </div>
          
          <div className="relative">
            <Weight className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number"
              name="weight"
              placeholder="體重 (kg)"
              value={formData.weight}
              onChange={handleChange}
              onBlur={handleBlur}
              className={getInputClassName('weight', formData.weight >= 20 && formData.weight <= 300)}
              required
              min="20"
              max="300"
            />
            {touched.weight && formData.weight && (formData.weight < 20 || formData.weight > 300) && (
              <p className="text-red-500 text-xs mt-1 ml-10">體重需介於 20-300 公斤之間</p>
            )}
          </div>
          
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="tel"
              name="phone"
              placeholder="電話（選填）"
              value={formData.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
          
          {formData.height && formData.weight && (
            <div className="bg-gray-50 rounded p-3">
              <p className="text-sm text-gray-600">
                BMI 指數: <span className="font-semibold">
                  {(formData.weight / Math.pow(formData.height / 100, 2)).toFixed(1)}
                </span>
              </p>
            </div>
          )}
          
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? '建立中...' : '建立帳戶'}
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
              已經有帳戶？{' '}
            </span>
            <Link 
              to="/login" 
              className="text-cyan-600 hover:text-cyan-700 text-sm no-underline"
            >
              立即登入
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;