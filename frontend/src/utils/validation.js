// src/utils/validation.js
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const validateForm = (formData, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const value = formData[field];
    const fieldRules = rules[field];
    
    if (fieldRules.required && (!value || value.trim() === '')) {
      errors[field] = `${fieldRules.label || field} 為必填欄位`;
      return;
    }
    
    if (value && fieldRules.email && !validateEmail(value)) {
      errors[field] = '請輸入有效的電子郵件地址';
      return;
    }
    
    if (value && fieldRules.minLength && value.length < fieldRules.minLength) {
      errors[field] = `${fieldRules.label || field} 必須至少 ${fieldRules.minLength} 個字元`;
      return;
    }
    
    if (value && fieldRules.pattern && !fieldRules.pattern.test(value)) {
      errors[field] = fieldRules.message || `${fieldRules.label || field} 格式無效`;
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};