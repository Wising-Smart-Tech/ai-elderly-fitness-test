import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMediaPipe } from '../hooks/useMediaPipe';
import { useChairStandDetection } from '../hooks/useChairStandDetection';
import { Activity, Play, RotateCcw, ArrowLeft, Clock, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const TestPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  // Test states
  const [currentPhase, setCurrentPhase] = useState('instructions'); // instructions, test, results
  const [sessionId, setSessionId] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  
  // MediaPipe hooks
  const { 
    videoRef, 
    canvasRef, 
    initialize,
    stop,
    isInitialized,
    currentLandmarks
  } = useMediaPipe('chair_stand');
  
  // Chair stand detection
  const { 
    isStanding,
    repCount,
    startTest,
    stopTest,
    resetTest,
    countdown,
    timeRemaining,
    testPhase
  } = useChairStandDetection(currentLandmarks);

  // Calculate user age
  const calculateAge = useCallback(() => {
    if (!user?.birthday) return 65;
    const birthDate = new Date(user.birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }, [user]);

  // Cleanup camera when leaving test phase or unmounting
  useEffect(() => {
    return () => {
      // Stop camera when component unmounts or phase changes away from test
      if (isInitialized) {
        stop();
      }
    };
  }, [isInitialized, stop]);

  // Handle phase change
  useEffect(() => {
    // Stop camera when leaving test phase
    if (currentPhase !== 'test' && isInitialized) {
      stop();
    }
  }, [currentPhase, isInitialized, stop]);

  // Start test session
  const startTestSession = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/tests/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notes: `Chair Stand Test - ${new Date().toLocaleDateString()}`
        })
      });

      if (!response.ok) throw new Error('Failed to start test session');
      
      const data = await response.json();
      setSessionId(data.sessionId);
      return data.sessionId;
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('無法開始測試會話');
      return null;
    }
  };

  // Start the test
  const handleStartTest = async () => {
    // Prevent multiple starts
    if (testPhase !== 'ready' || isCameraLoading) {
      return;
    }
    
    // Initialize camera first if not already initialized
    if (!isInitialized) {
      setIsCameraLoading(true);
      setCameraError(null);
      try {
        await initialize();
        setIsCameraLoading(false);
      } catch (err) {
        console.error('Camera initialization failed:', err);
        setCameraError('無法初始化攝影機，請確認攝影機權限');
        toast.error('無法啟動攝影機，請檢查權限設定');
        setIsCameraLoading(false);
        return;
      }
    }

    // Create session
    const newSessionId = await startTestSession();
    if (!newSessionId) return;

    // Start test with countdown
    startTest();
  };

  // Handle test completion
  useEffect(() => {
    const handleCompletion = async () => {
      if (testPhase === 'completed' && sessionId) {
        await submitTestResults();
        // Stop camera after test completes
        if (isInitialized) {
          stop();
        }
      }
    };
    handleCompletion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testPhase]);

  // Stop the test
  const handleStopTest = async () => {
    stopTest();
    if (sessionId) {
      await submitTestResults();
    }
    // Stop camera after test is stopped
    if (isInitialized) {
      stop();
    }
  };

  // Submit test results to backend
  const submitTestResults = async () => {
    if (!sessionId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const userAge = calculateAge();
      
      // Submit result
      const response = await fetch('http://localhost:3000/api/tests/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId: sessionId,
          testTypeId: 1, // Chair Stand Test ID
          score: repCount,
          userAge: userAge,
          userGender: user?.gender || 'male',
          rawData: {
            duration: 30,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) throw new Error('Failed to submit results');
      
      const data = await response.json();
      
      // Complete session
      await fetch(`http://localhost:3000/api/tests/session/${sessionId}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setTestResults({
        score: repCount,
        performanceLevel: data.data?.result?.performance_level || data.performanceLevel,
        percentile: data.data?.result?.percentile || data.percentile,
        age: userAge,
        gender: user?.gender || 'male'
      });

      setCurrentPhase('results');
      toast.success('測試完成！');
    } catch (error) {
      console.error('Error submitting results:', error);
      toast.error('提交結果時發生錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset test
  const handleReset = () => {
    resetTest();
    setCameraError(null);
  };

  // Get performance level in Chinese
  const getPerformanceLevelChinese = (level) => {
    const translations = {
      'excellent': '優秀',
      'good': '良好',
      'average': '普通',
      'fair': '尚可',
      'poor': '需改善'
    };
    return translations[level] || '未知';
  };

  // Get performance badge color
  const getPerformanceBadgeColor = (level) => {
    const colors = {
      'excellent': 'bg-green-500',
      'good': 'bg-blue-500',
      'average': 'bg-yellow-500',
      'fair': 'bg-orange-500',
      'poor': 'bg-red-500'
    };
    return colors[level] || 'bg-gray-500';
  };

  // Get recommendations based on performance
  const getRecommendations = (level) => {
    const recommendations = {
      'excellent': '您的下肢肌力表現優秀！請繼續保持目前的運動習慣。',
      'good': '您的下肢肌力狀況良好，建議維持規律運動，可適度增加運動強度。',
      'average': '您的下肢肌力屬於平均水準，建議增加下肢肌力訓練頻率。',
      'fair': '建議加強下肢肌力練習，每週進行3-4次輕度阻力訓練。',
      'poor': '建議諮詢醫師或物理治療師，制定個人化運動計畫來改善下肢肌力。'
    };
    return recommendations[level] || '請諮詢專業人員。';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">椅子坐立測試</h1>
          <p className="text-white/90">30秒下肢肌力評估</p>
        </div>

        {/* Phase Indicator */}
        <div className="flex justify-center mb-8 gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            currentPhase === 'instructions' ? 'bg-white text-blue-600' : 'bg-white/20 text-white'
          }`}>
            <div className="w-8 h-8 rounded-full bg-current opacity-20"></div>
            <span className="font-medium">說明</span>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            currentPhase === 'test' ? 'bg-white text-blue-600' : 'bg-white/20 text-white'
          }`}>
            <div className="w-8 h-8 rounded-full bg-current opacity-20"></div>
            <span className="font-medium">測試</span>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            currentPhase === 'results' ? 'bg-white text-blue-600' : 'bg-white/20 text-white'
          }`}>
            <div className="w-8 h-8 rounded-full bg-current opacity-20"></div>
            <span className="font-medium">結果</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8">
          {/* Instructions Phase */}
          {currentPhase === 'instructions' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-100">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-blue-600" />
                  測試說明
                </h2>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>請坐在椅子上，雙腳平放地面，與肩同寬</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>雙手交叉抱胸，保持背部挺直</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>測試開始後，在30秒內盡可能多次完整站立和坐下</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>確保每次站起時膝蓋完全伸直，坐下時完全接觸椅面</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>系統會自動偵測並計算您的完成次數</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-lg border border-teal-100">
                <h3 className="font-semibold text-gray-800 mb-2">準備事項</h3>
                <p className="text-gray-600">
                  請確保您的攝影機能清楚拍攝到您的全身動作，建議將攝影機放置在側面約2-3公尺處。
                </p>
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    if (isInitialized) {
                      stop();
                    }
                    navigate('/app');
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all flex items-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  返回主頁
                </button>
                <button
                  onClick={() => setCurrentPhase('test')}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
                >
                  開始準備
                  <Play className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Test Phase */}
          {currentPhase === 'test' && (
            <div className="space-y-6">
              {/* Camera Error */}
              {cameraError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                  <p className="font-medium">攝影機錯誤</p>
                  <p className="text-sm mt-1">{cameraError}</p>
                </div>
              )}

              {/* Camera View */}
              <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ minHeight: '480px' }}>
                <video
                  ref={videoRef}
                  className="w-full h-auto"
                  style={{ display: 'none' }}
                  autoPlay
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  className="w-full h-full"
                  style={{ display: isInitialized ? 'block' : 'none' }}
                />
                {!isInitialized && !isCameraLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <p className="text-gray-600 mb-2">請按下方「開始測試」按鈕啟動攝影機</p>
                      <p className="text-gray-500 text-sm">首次使用需要允許攝影機權限</p>
                    </div>
                  </div>
                )}
                {isCameraLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">正在初始化攝影機...</p>
                      <p className="text-gray-500 text-sm mt-2">請允許瀏覽器使用攝影機</p>
                    </div>
                  </div>
                )}
                {/* Countdown Display */}
                {countdown > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 pointer-events-none">
                    <div className="text-9xl font-bold text-white animate-pulse">
                      {countdown}
                    </div>
                  </div>
                )}
              </div>

              {/* Control Buttons */}
              <div className="flex justify-center gap-4">
                {testPhase === 'ready' ? (
                  <>
                    <button
                      onClick={() => {
                        setCurrentPhase('instructions');
                        if (isInitialized) {
                          stop();
                        }
                      }}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all flex items-center gap-2"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      返回說明
                    </button>
                    <button
                      onClick={handleStartTest}
                      disabled={isCameraLoading}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCameraLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          初始化攝影機...
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" />
                          開始測試
                        </>
                      )}
                    </button>
                  </>
                ) : testPhase === 'testing' ? (
                  <>
                    <button
                      onClick={handleStopTest}
                      className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                    >
                      停止測試
                    </button>
                  </>
                ) : testPhase === 'completed' ? (
                  <button
                    onClick={handleReset}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all flex items-center gap-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    重新測試
                  </button>
                ) : null}
              </div>

              {/* Stats Display */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-red-500 to-orange-500 p-6 rounded-lg text-white">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-8 h-8" />
                    <div className="text-3xl font-bold">{timeRemaining}</div>
                  </div>
                  <div className="text-white/90">剩餘秒數</div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-teal-500 p-6 rounded-lg text-white">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-8 h-8" />
                    <div className="text-3xl font-bold">{repCount}</div>
                  </div>
                  <div className="text-white/90">完成次數</div>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-6 rounded-lg text-white">
                  <div className="flex items-center gap-3 mb-2">
                    <Activity className="w-8 h-8" />
                    <div className="text-2xl font-bold">{isStanding ? '站立' : '坐下'}</div>
                  </div>
                  <div className="text-white/90">目前狀態</div>
                </div>
              </div>
            </div>
          )}

          {/* Results Phase */}
          {currentPhase === 'results' && testResults && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-teal-500 rounded-full mb-4">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">測試完成！</h2>
                <p className="text-gray-600">以下是您的測試結果分析</p>
              </div>

              {/* Score Display */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-8 rounded-lg border border-blue-100 text-center">
                <div className="text-5xl font-bold text-blue-600 mb-2">{testResults.score}</div>
                <div className="text-gray-600 mb-4">30秒完成次數</div>
                <div className={`inline-block px-4 py-2 rounded-full text-white font-medium ${getPerformanceBadgeColor(testResults.performanceLevel)}`}>
                  {getPerformanceLevelChinese(testResults.performanceLevel)}
                </div>
              </div>

              {/* Performance Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-lg border border-teal-100">
                  <h3 className="font-semibold text-gray-800 mb-3">年齡組別表現</h3>
                  <p className="text-gray-600 mb-2">
                    年齡：{testResults.age}歲 | 性別：{testResults.gender === 'male' ? '男性' : '女性'}
                  </p>
                  <p className="text-gray-700">
                    您在同年齡組中的表現為 <span className="font-semibold text-teal-600">{getPerformanceLevelChinese(testResults.performanceLevel)}</span>
                  </p>
                  {testResults.percentile && (
                    <p className="text-gray-600 mt-2">
                      超越了 <span className="font-semibold">{testResults.percentile}%</span> 的同齡人
                    </p>
                  )}
                </div>

                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-6 rounded-lg border border-cyan-100">
                  <h3 className="font-semibold text-gray-800 mb-3">健康建議</h3>
                  <p className="text-gray-700">
                    {getRecommendations(testResults.performanceLevel)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    if (isInitialized) {
                      stop();
                    }
                    navigate('/app');
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all flex items-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  返回主頁
                </button>
                <button
                  onClick={() => {
                    if (isInitialized) {
                      stop();
                    }
                    navigate('/app/results');
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                >
                  查看歷史記錄
                </button>
                <button
                  onClick={() => {
                    setCurrentPhase('instructions');
                    setTestResults(null);
                    setSessionId(null);
                    resetTest();
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  重新測試
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestPage;