import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    height: user?.height || '',
    weight: user?.weight || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await updateProfile(formData);
      setIsEditing(false);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      height: user?.height || '',
      weight: user?.weight || ''
    });
    setError('');
  };

  const calculateAge = (birthday) => {
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculateBMI = (height, weight) => {
    const heightInM = height / 100;
    return (weight / (heightInM * heightInM)).toFixed(1);
  };

  const getBMICategory = (bmi) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'warning' };
    if (bmi < 25) return { label: 'Normal', color: 'success' };
    if (bmi < 30) return { label: 'Overweight', color: 'warning' };
    return { label: 'Obese', color: 'error' };
  };

  const bmi = user?.height && user?.weight ? calculateBMI(user.height, user.weight) : null;
  const bmiCategory = bmi ? getBMICategory(parseFloat(bmi)) : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card variant="elevated" size="large">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
              <p className="text-gray-600 mt-1">Manage your personal information and health metrics</p>
            </div>
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="primary"
                size="large"
                icon="edit"
              >
                Edit Profile
              </Button>
            )}
          </div>
        </Card>

        {/* Profile Content */}
        {isEditing ? (
          <Card variant="elevated" size="large">
            <form onSubmit={handleSubmit} className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Edit Information</h2>
              
              {error && (
                <div className="alert alert-error">
                  {error}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <Input
                  label="Full Name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  size="large"
                  required
                />

                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  size="large"
                />

                <Input
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(123) 456-7890"
                  size="large"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Height"
                    name="height"
                    type="number"
                    value={formData.height}
                    onChange={handleChange}
                    placeholder="170"
                    size="large"
                    suffix="cm"
                    min="50"
                    max="250"
                  />

                  <Input
                    label="Weight"
                    name="weight"
                    type="number"
                    value={formData.weight}
                    onChange={handleChange}
                    placeholder="70"
                    size="large"
                    suffix="kg"
                    min="20"
                    max="300"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  variant="success"
                  size="large"
                  loading={loading}
                  loadingText="Saving..."
                  fullWidth
                >
                  Save Changes
                </Button>
                <Button
                  type="button"
                  onClick={handleCancel}
                  variant="outline"
                  size="large"
                  fullWidth
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <>
            {/* Personal Information */}
            <Card variant="elevated" size="large">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Personal Information</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 uppercase tracking-wider">Full Name</p>
                  <p className="text-lg font-medium text-gray-900">{user?.name || 'Not set'}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-gray-500 uppercase tracking-wider">Gender</p>
                  <p className="text-lg font-medium text-gray-900">
                    {user?.gender ? (user.gender === 'male' ? 'Male' : 'Female') : 'Not set'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-gray-500 uppercase tracking-wider">Email Address</p>
                  <p className="text-lg font-medium text-gray-900">{user?.email || 'Not set'}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-gray-500 uppercase tracking-wider">Phone Number</p>
                  <p className="text-lg font-medium text-gray-900">{user?.phone || 'Not set'}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-gray-500 uppercase tracking-wider">Date of Birth</p>
                  <p className="text-lg font-medium text-gray-900">
                    {user?.birthday ? new Date(user.birthday).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'Not set'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-gray-500 uppercase tracking-wider">Age</p>
                  <p className="text-lg font-medium text-gray-900">
                    {user?.birthday ? `${calculateAge(user.birthday)} years` : 'Not set'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-gray-500 uppercase tracking-wider">Height</p>
                  <p className="text-lg font-medium text-gray-900">
                    {user?.height ? `${user.height} cm` : 'Not set'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-gray-500 uppercase tracking-wider">Weight</p>
                  <p className="text-lg font-medium text-gray-900">
                    {user?.weight ? `${user.weight} kg` : 'Not set'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Health Metrics */}
            <Card variant="elevated" size="large">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Health Metrics</h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                <StatCard
                  label="BMI"
                  value={bmi || '--'}
                  suffix={bmiCategory?.label}
                  icon="📊"
                  iconColor={bmiCategory?.color || 'primary'}
                  variant="filled"
                  size="large"
                />
                
                <StatCard
                  label="Fitness Level"
                  value="Good"
                  icon="💪"
                  iconColor="success"
                  variant="filled"
                  size="large"
                />
                
                <StatCard
                  label="Fall Risk"
                  value="Low"
                  icon="🛡️"
                  iconColor="success"
                  variant="filled"
                  size="large"
                />
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Health Tip:</strong> Regular fitness assessments help track your progress and identify areas for improvement. 
                  Complete all six fitness tests for a comprehensive evaluation.
                </p>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;