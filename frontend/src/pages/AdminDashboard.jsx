import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Users, UserPlus, Edit, Ban, LogOut, Activity, Mail, Check, X, User, Lock, Phone, Calendar, Ruler, Weight, AlertCircle } from 'lucide-react';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleDelete = (user) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchUsers();
        setShowDeleteDialog(false);
        setSelectedUser(null);
      } else {
        const data = await response.json();
        alert(data.message || '刪除失敗');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('刪除失敗，請重試');
    } finally {
      setDeleteLoading(false);
    }
  };

  const CreateUserModal = () => {
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      password: '',
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
      if (error) setError('');
    };

    const handleBlur = (e) => {
      const { name } = e.target;
      setTouched(prev => ({
        ...prev,
        [name]: true
      }));
    };

    const isEmailValid = (email) => {
      return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const getInputClassName = (fieldName, additionalValidation = true) => {
      const baseClass = "w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent";
      const isInvalid = touched[fieldName] && (!formData[fieldName] || !additionalValidation);
      return `${baseClass} ${isInvalid ? 'border-red-500' : 'border-gray-300'}`;
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      // Validation
      if (!formData.gender) {
        setError('請選擇性別');
        return;
      }
      
      if (formData.email && !isEmailValid(formData.email)) {
        setError('請輸入有效的電子郵件');
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
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          setShowCreateModal(false);
          fetchUsers();
        } else {
          const data = await response.json();
          setError(data.message || '建立用戶失敗');
        }
      } catch (error) {
        console.error('Error creating user:', error);
        setError('建立用戶失敗，請重試');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto pt-10 pb-10">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-700 to-blue-800 rounded-full mb-4">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">建立長者用戶</h3>
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
                placeholder="電子郵件（選填）"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
                placeholder="密碼（選填，預設為 123456）"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
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
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-700 to-blue-800 text-white py-2 rounded-lg font-medium hover:from-teal-800 hover:to-blue-900 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                <UserPlus className="w-4 h-4" />
                {loading ? '建立中...' : '建立用戶'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-slate-500 text-slate-600 py-2 rounded-lg font-medium hover:bg-slate-50 transition-all"
              >
                <X className="w-4 h-4" />
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const EditUserModal = () => {
    const [formData, setFormData] = useState({
      name: selectedUser?.name || '',
      email: selectedUser?.email || '',
      password: '',
      gender: selectedUser?.gender || '',
      birthday: selectedUser?.birthday ? selectedUser.birthday.split('T')[0] : '',
      height: selectedUser?.height || '',
      weight: selectedUser?.weight || '',
      phone: selectedUser?.phone || ''
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
      if (error) setError('');
    };

    const handleBlur = (e) => {
      const { name } = e.target;
      setTouched(prev => ({
        ...prev,
        [name]: true
      }));
    };

    const isEmailValid = (email) => {
      return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const getInputClassName = (fieldName, additionalValidation = true) => {
      const baseClass = "w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent";
      const isInvalid = touched[fieldName] && (!formData[fieldName] || !additionalValidation);
      return `${baseClass} ${isInvalid ? 'border-red-500' : 'border-gray-300'}`;
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      if (!formData.gender) {
        setError('請選擇性別');
        return;
      }
      
      if (formData.email && !isEmailValid(formData.email)) {
        setError('請輸入有效的電子郵件');
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
        const token = localStorage.getItem('token');
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        
        const response = await fetch(`http://localhost:3000/api/admin/users/${selectedUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updateData)
        });

        if (response.ok) {
          fetchUsers();
          setShowEditModal(false);
          setSelectedUser(null);
        } else {
          const data = await response.json();
          setError(data.message || '更新失敗');
        }
      } catch (error) {
        console.error('Error updating user:', error);
        setError('更新失敗，請重試');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto pt-10 pb-10">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-700 to-teal-800 rounded-full mb-4">
              <Edit className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">編輯用戶資料</h3>
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
                placeholder="電子郵件（選填）"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
                placeholder="新密碼（留空則不更改）"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
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
                type="date"
                name="birthday"
                placeholder="生日"
                value={formData.birthday}
                onChange={handleChange}
                onBlur={handleBlur}
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
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-700 to-teal-800 text-white py-2 rounded-lg font-medium hover:from-blue-800 hover:to-teal-900 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                <Edit className="w-4 h-4" />
                {loading ? '更新中...' : '更新資料'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-slate-500 text-slate-600 py-2 rounded-lg font-medium hover:bg-slate-50 transition-all"
              >
                <X className="w-4 h-4" />
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const DeleteConfirmDialog = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full mb-4">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">確認刪除</h3>
            <p className="text-gray-600">
              確定要刪除用戶 <span className="font-semibold">{selectedUser?.name}</span> 嗎？
            </p>
            <p className="text-sm text-red-600 mt-2">此操作無法復原</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={confirmDelete}
              disabled={deleteLoading}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 text-white py-2 rounded-lg font-medium hover:from-red-600 hover:to-orange-600 transition-all disabled:opacity-50"
            >
              <Ban className="w-4 h-4" />
              {deleteLoading ? '刪除中...' : '確認刪除'}
            </button>
            <button
              onClick={() => {
                setShowDeleteDialog(false);
                setSelectedUser(null);
              }}
              disabled={deleteLoading}
              className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition-all"
            >
              <X className="w-4 h-4" />
              取消
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-blue-900 to-teal-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 relative">
          <button
            onClick={handleLogout}
            className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 bg-white border-2 border-red-500 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-all"
          >
            <LogOut className="w-4 h-4" />
            登出
          </button>
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-700 to-teal-800 rounded-full mb-4">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">管理員儀表板</h1>
            <p className="text-gray-600">歡迎，{user?.name}</p>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-slate-100 to-blue-100 text-slate-800 mt-2">
              <Shield className="w-3 h-3 mr-1" />
              管理員權限
            </span>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-slate-600 to-blue-700 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">用戶管理</h2>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-teal-700 to-blue-800 text-white px-6 py-3 rounded-lg font-medium hover:from-teal-800 hover:to-blue-900 transition-all transform hover:scale-[1.02] shadow-lg"
            >
              <UserPlus className="w-4 h-4" />
              建立用戶
            </button>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-slate-700 to-teal-800 rounded-full animate-spin">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <p className="mt-4 text-gray-600">載入中...</p>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-1">
              <div className="bg-white rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-100 to-blue-100">
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">ID</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">姓名</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">電子郵件</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">角色</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">性別</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">狀態</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-900">#{user.id}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-teal-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {user.name?.charAt(0) || 'U'}
                              </div>
                              <span className="text-sm font-medium text-gray-900">{user.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {user.email ? (
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-gray-400" />
                                {user.email}
                              </div>
                            ) : (
                              <span className="text-gray-400">未設定</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              user.role === 'admin' 
                                ? 'bg-gradient-to-r from-slate-100 to-blue-100 text-slate-800' 
                                : 'bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-800'
                            }`}>
                              {user.role === 'admin' ? (
                                <>
                                  <Shield className="w-3 h-3 mr-1" />
                                  管理員
                                </>
                              ) : (
                                <>
                                  <Users className="w-3 h-3 mr-1" />
                                  長者
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {user.gender === 'male' ? '男' : '女'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              user.isActive 
                                ? 'bg-gradient-to-r from-green-100 to-teal-100 text-green-800' 
                                : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800'
                            }`}>
                              {user.isActive ? (
                                <>
                                  <Check className="w-3 h-3 mr-1" />
                                  啟用
                                </>
                              ) : (
                                <>
                                  <X className="w-3 h-3 mr-1" />
                                  停用
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleEdit(user)}
                                className="p-2 bg-gradient-to-r from-slate-600 to-blue-700 text-white rounded-lg hover:from-slate-700 hover:to-blue-800 transition-all"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => handleDelete(user)}
                                className="p-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all"
                              >
                                <Ban className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {users.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">沒有找到用戶</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-4 rounded-lg border border-slate-200">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-slate-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm mb-1">總用戶數</h3>
                  <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-lg border border-teal-200">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-teal-700 to-cyan-800 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm mb-1">活躍用戶</h3>
                  <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.isActive).length}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-slate-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-800 to-slate-700 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm mb-1">管理員</h3>
                  <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role === 'admin').length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-xs text-gray-500">
              © 2024 AI 高齡體適能檢測系統 - 管理員控制台
            </p>
          </div>
        </div>
      </div>

      {showCreateModal && <CreateUserModal />}
      {showEditModal && <EditUserModal />}
      {showDeleteDialog && <DeleteConfirmDialog />}
    </div>
  );
};

export default AdminDashboard;