// src/pages/TestPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, RotateCcw, Timer, TrendingUp, User } from 'lucide-react';
import toast from 'react-hot-toast';

import TestCamera from '../components/TestCamera';
import { useChairStandDetection } from '../hooks/useChairStandDetection';
import { useAuth } from '../contexts/AuthContext';
import { useTest } from '../contexts/TestContext';

const TestPage = () => {
  const { testType } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startSession, completeSession, submitTestResult } = useTest();

  // Test state
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [timer, setTimer] = useState(30);
  const [landmarks, setLandmarks] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // Detection hook
  const { repCount, currentStatus, resetDetection } = useChairStandDetection(landmarks, isTestRunning);

  const timerRef = useRef(null);
  const testStartTime = useRef(null);

  // Test configuration
  const testConfig = {
    chair_stand: {
      name: '椅子坐立',
      duration: 30,
      unit: '次',
      description: '30秒內盡可能多次完整坐立，評估下肢肌耐力',
      instructions: [
        '請坐在椅子上，雙腳平放地面',
        '雙手交叉抱胸',
        '測試開始後，在30秒內盡可能多次站起坐下',
        '確保每次站起時膝蓋完全伸直',
        '系統會自動計算完成次數'
      ]
    }
  };

  const config = testConfig[testType];

  useEffect(() => {
    if (!config) {
      toast.error('未知的測試類型');
      navigate('/app');
    }
  }, [testType, config, navigate]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startTest = async () => {
    try {
      // Start session
      const session = await startSession(`${config.name}測試`);
      setCurrentSession(session);

      // Reset states
      resetDetection();
      setTimer(config.duration);
      setIsTestRunning(true);
      setShowResults(false);
      testStartTime.current = Date.now();

      // Start countdown
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            stopTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      toast.success('測試開始！');
    } catch (error) {
      toast.error('無法開始測試');
    }
  };

  const stopTest = async () => {
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setIsTestRunning(false);

      if (currentSession) {
        // Complete session
        await completeSession(currentSession.id);

        // Calculate user age
        const birthDate = new Date(user.birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }

        // Submit result
        const resultData = {
          sessionId: currentSession.id,
          testTypeId: 1, // chair_stand test
          score: repCount,
          userAge: age,
          userGender: user.gender,
          rawData: {
            testDuration: config.duration,
            actualDuration: Math.floor((Date.now() - testStartTime.current) / 1000),
            repCount: repCount,
            timestamp: new Date().toISOString()
          }
        };

        await submitTestResult(resultData);
        setShowResults(true);
        toast.success('測試完成！');
      }
    } catch (error) {
      toast.error('測試結束時發生錯誤');
    }
  };

  const resetTest = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsTestRunning(false);
    setTimer(config.duration);
    resetDetection();
    setCurrentSession(null);
    setShowResults(false);
    testStartTime.current = null;
  };

  const getPerformanceLevel = (score, age, gender) => {
    // Simplified scoring logic - you can expand this
    const scoringTable = {
      male: {
        "65-69": { excellent: 23, good: 20, average: 17, fair: 13 },
        "70-74": { excellent: 21, good: 19, average: 16, fair: 11 },
        "75-79": { excellent: 23, good: 19, average: 14, fair: 10 },
        "80+": { excellent: 20, good: 17, average: 13, fair: 8 }
      },
      female: {
        "65-69": { excellent: 22, good: 19, average: 16, fair: 10 },
        "70-74": { excellent: 21, good: 18, average: 15, fair: 10 },
        "75-79": { excellent: 20, good: 18, average: 14, fair: 7 },
        "80+": { excellent: 17, good: 14, average: 11, fair: 7 }
      }
    };

    const ageGroup = age >= 80 ? "80+" : age >= 75 ? "75-79" : age >= 70 ? "70-74" : "65-69";
    const thresholds = scoringTable[gender]?.[ageGroup];

    if (!thresholds) return 'average';

    if (score >= thresholds.excellent) return 'excellent';
    if (score >= thresholds.good) return 'good';
    if (score >= thresholds.average) return 'average';
    if (score >= thresholds.fair) return 'fair';
    return 'poor';
  };

  const getLevelColor = (level) => {
    const colors = {
      excellent: 'text-green-600 bg-green-100',
      good: 'text-blue-600 bg-blue-100',
      average: 'text-yellow-600 bg-yellow-100',
      fair: 'text-orange-600 bg-orange-100',
      poor: 'text-red-600 bg-red-100'
    };
    return colors[level] || colors.average;
  };

  const getLevelText = (level) => {
    const texts = {
      excellent: '很好',
      good: '尚好',
      average: '普通',
      fair: '稍差',
      poor: '不好'
    };
    return texts[level] || '普通';
  };

  if (!config) {
    return null;
  }

  // Calculate performance if showing results
  let performanceLevel = 'average';
  if (showResults && user) {
    const birthDate = new Date(user.birthday);
    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    performanceLevel = getPerformanceLevel(repCount, age, user.gender);
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{config.name}測試</h1>
        <p className="text-gray-600">{config.description}</p>
      </div>

      {/* Instructions */}
      {!isTestRunning && !showResults && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-6"
        >
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
            <User className="w-5 h-5 mr-2" />
            測試說明
          </h3>
          <ul className="space-y-2 text-blue-800">
            {config.instructions.map((instruction, index) => (
              <li key={index} className="flex items-start">
                <span className="bg-blue-200 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full mr-3 mt-0.5">
                  {index + 1}
                </span>
                {instruction}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <h3 className="font-semibold text-gray-900">測試區域</h3>
            </div>
            <div className="p-4">
              <TestCamera
                onLandmarksUpdate={setLandmarks}
                className="w-full h-96"
              />
            </div>
          </div>
        </div>

        {/* Controls and Stats */}
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">測試控制</h3>
            <div className="space-y-3">
              {!isTestRunning ? (
                <button
                  onClick={startTest}
                  disabled={!landmarks}
                  className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <Play className="w-5 h-5 mr-2" />
                  開始測試
                </button>
              ) : (
                <button
                  onClick={stopTest}
                  className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Square className="w-5 h-5 mr-2" />
                  停止測試
                </button>
              )}
              
              <button
                onClick={resetTest}
                className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                重置
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-4">
            {/* Timer */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">剩餘時間</span>
                <Timer className="w-4 h-4 text-gray-400" />
              </div>
              <div className={`text-3xl font-bold ${timer <= 10 ? 'text-red-600' : 'text-blue-600'}`}>
                {timer}
              </div>
              <div className="text-sm text-gray-500">秒</div>
            </div>

            {/* Rep Counter */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">完成次數</span>
                <TrendingUp className="w-4 h-4 text-gray-400" />
              </div>
              <motion.div
                key={repCount}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-3xl font-bold text-green-600"
              >
                {repCount}
              </motion.div>
              <div className="text-sm text-gray-500">次</div>
            </div>

            {/* Status */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-sm font-medium text-gray-600 mb-2">目前狀態</div>
              <div className="text-lg font-semibold text-purple-600">
                {isTestRunning ? currentStatus : landmarks ? '準備就緒' : '等待攝影機'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Modal */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-lg max-w-md w-full p-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-2">測試完成！</h3>
                
                <div className="text-6xl font-bold text-blue-600 mb-2">{repCount}</div>
                <p className="text-gray-600 mb-4">30秒完成次數</p>
                
                <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getLevelColor(performanceLevel)}`}>
                  體能等級：{getLevelText(performanceLevel)}
                </div>
                
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => navigate('/app/results')}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    查看詳細報告
                  </button>
                  <button
                    onClick={() => setShowResults(false)}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    繼續測試
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TestPage;