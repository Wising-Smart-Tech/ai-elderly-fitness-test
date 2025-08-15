import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, Edit2, Save, X, ArrowLeft,
  TrendingUp, Calendar, Ruler, Weight,
  Mail, Phone
} from 'lucide-react';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, token, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    height: '',
    weight: '',
    gender: '',
    birthday: ''
  });

  // Initialize form data with user info
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        height: user.height || '',
        weight: user.weight || '',
        gender: user.gender || '',
        birthday: user.birthday ? user.birthday.split('T')[0] : ''
      });
    }
  }, [user]);

  // Calculate age from birthday
  const calculateAge = (birthday) => {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Calculate BMI
  const calculateBMI = (height, weight) => {
    if (!height || !weight) return null;
    const heightInM = height / 100;
    return (weight / (heightInM * heightInM)).toFixed(1);
  };

  // Get BMI category
  const getBMICategory = (bmi) => {
    if (!bmi) return null;
    const bmiValue = parseFloat(bmi);
    if (bmiValue < 18.5) return { label: '過輕', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (bmiValue < 24) return { label: '正常', color: 'text-green-600', bg: 'bg-green-50' };
    if (bmiValue < 27) return { label: '過重', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { label: '肥胖', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`http://localhost:3000/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          height: formData.height ? parseInt(formData.height) : null,
          weight: formData.weight ? parseInt(formData.weight) : null
        })
      });

      if (!response.ok) {
        throw new Error('更新失敗');
      }

      const data = await response.json();
      
      // Update the local form data with the returned user data
      if (data.user) {
        // Update local state with new data
        const updatedFormData = {
          name: data.user.name || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          height: data.user.height || '',
          weight: data.user.weight || '',
          gender: data.user.gender || user.gender || '',
          birthday: data.user.birthday ? data.user.birthday.split('T')[0] : user.birthday ? user.birthday.split('T')[0] : ''
        };
        setFormData(updatedFormData);
        
        // Update the user in AuthContext
        updateUser({
          ...user,
          name: data.user.name,
          email: data.user.email,
          phone: data.user.phone,
          height: data.user.height,
          weight: data.user.weight
        });
      }

      toast.success('個人資料已更新');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('更新個人資料時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data to original user data
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      height: user?.height || '',
      weight: user?.weight || '',
      gender: user?.gender || '',
      birthday: user?.birthday ? user.birthday.split('T')[0] : ''
    });
  };

  const age = calculateAge(formData.birthday);
  const bmi = calculateBMI(formData.height, formData.weight);
  const bmiCategory = getBMICategory(bmi);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/app')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">個人檔案</h1>
                <p className="text-gray-600 text-sm mt-1">管理您的個人資料與健康指標</p>
              </div>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:shadow-lg transition-all"
              >
                <Edit2 className="w-4 h-4" />
                編輯資料
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {isEditing ? (
          // Edit Mode
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">編輯個人資料</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    姓名
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    電子郵件
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    電話號碼
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    出生日期
                  </label>
                  <input
                    type="date"
                    name="birthday"
                    value={formData.birthday}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">出生日期無法修改</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    身高 (公分)
                  </label>
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    min="50"
                    max="250"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    體重 (公斤)
                  </label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    min="20"
                    max="300"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      儲存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      儲存變更
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all"
                >
                  <X className="w-5 h-5" />
                  取消
                </button>
              </div>
            </form>
          </div>
        ) : (
          // View Mode
          <>
            {/* Personal Information */}
            <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <User className="w-6 h-6 text-blue-500" />
                個人資料
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">姓名</p>
                  <p className="text-lg font-medium text-gray-900">{formData.name || '未設定'}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-gray-500">性別</p>
                  <p className="text-lg font-medium text-gray-900">
                    {formData.gender === 'male' ? '男性' : formData.gender === 'female' ? '女性' : '未設定'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-gray-500">電子郵件</p>
                  <p className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {formData.email || '未設定'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-gray-500">電話號碼</p>
                  <p className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {formData.phone || '未設定'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-gray-500">出生日期</p>
                  <p className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {formData.birthday ? new Date(formData.birthday).toLocaleDateString('zh-TW') : '未設定'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-gray-500">年齡</p>
                  <p className="text-lg font-medium text-gray-900">
                    {age ? `${age} 歲` : '未設定'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-gray-500">身高</p>
                  <p className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-gray-400" />
                    {formData.height ? `${formData.height} 公分` : '未設定'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-gray-500">體重</p>
                  <p className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Weight className="w-4 h-4 text-gray-400" />
                    {formData.weight ? `${formData.weight} 公斤` : '未設定'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-gray-500">身體質量指數 (BMI)</p>
                  <p className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    {bmi ? (
                      <>
                        <span>{bmi}</span>
                        {bmiCategory && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${bmiCategory.bg} ${bmiCategory.color}`}>
                            {bmiCategory.label}
                          </span>
                        )}
                      </>
                    ) : '未設定'}
                  </p>
                  {bmi && (
                    <p className="text-xs text-gray-500">正常範圍: 18.5 - 24</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;