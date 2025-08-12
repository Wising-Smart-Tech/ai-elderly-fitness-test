// src/contexts/TestContext.jsx
import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const TestContext = createContext();

export const useTest = () => {
  const context = useContext(TestContext);
  if (!context) {
    throw new Error('useTest must be used within a TestProvider');
  }
  return context;
};

export const TestProvider = ({ children }) => {
  const [currentSession, setCurrentSession] = useState(null);
  const [testResults, setTestResults] = useState([]);

  const startSession = async (notes = '') => {
    try {
      const response = await axios.post('/tests/session', { notes });
      setCurrentSession(response.data.data);
      toast.success('測試會話已開始');
      return response.data.data;
    } catch (error) {
      toast.error('無法開始測試會話');
      throw error;
    }
  };

  const completeSession = async (sessionId) => {
    try {
      const response = await axios.put(`/tests/session/${sessionId}/complete`);
      setCurrentSession(null);
      toast.success('測試會話已完成');
      return response.data.data;
    } catch (error) {
      toast.error('無法完成測試會話');
      throw error;
    }
  };

  const submitTestResult = async (resultData) => {
    try {
      const response = await axios.post('/tests/result', resultData);
      toast.success('測試結果已提交');
      return response.data.data;
    } catch (error) {
      toast.error('提交測試結果失敗');
      throw error;
    }
  };

  const getUserResults = async (userId, filters = {}) => {
    try {
      const response = await axios.get(`/tests/user/${userId}/results`, {
        params: filters
      });
      setTestResults(response.data.data.results);
      return response.data.data;
    } catch (error) {
      toast.error('無法載入測試結果');
      throw error;
    }
  };

  const value = {
    currentSession,
    testResults,
    startSession,
    completeSession,
    submitTestResult,
    getUserResults
  };

  return (
    <TestContext.Provider value={value}>
      {children}
    </TestContext.Provider>
  );
};