import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMediaPipe } from '../hooks/useMediaPipe';
import { useChairStandDetection } from '../hooks/useChairStandDetection';
import { useArmCurlDetection } from '../hooks/useArmCurlDetection';
import { useBackScratchDetection } from '../hooks/useBackScratchDetection';
import { useSitAndReachDetection } from '../hooks/useSitAndReachDetection';
import { useEightFootUpAndGoDetection } from '../hooks/useEightFootUpAndGoDetection';
import { useStepInPlaceDetection } from '../hooks/useStepInPlaceDetection';
import { 
  Activity, Play, RotateCcw, ArrowLeft, Clock, TrendingUp, AlertCircle, 
  CheckCircle, ChevronRight, Home, Award, Ruler, Timer, Footprints
} from 'lucide-react';
import toast from 'react-hot-toast';

// Test configurations
const TEST_CONFIGS = [
  {
    id: 1,
    name: '椅子坐立測試',
    description: '30秒下肢肌力評估',
    icon: <Activity className="w-6 h-6" />,
    duration: '30秒',
    category: '肌力'
  },
  {
    id: 2,
    name: '肱二頭肌手臂屈舉',
    description: '30秒上肢肌力評估',
    icon: <TrendingUp className="w-6 h-6" />,
    duration: '30秒',
    category: '肌力'
  },
  {
    id: 3,
    name: '抓背測驗',
    description: '上肢柔軟度評估',
    icon: <Ruler className="w-6 h-6" />,
    duration: '單次測量',
    category: '柔軟度'
  },
  {
    id: 4,
    name: '椅子坐姿體前彎',
    description: '下肢柔軟度評估',
    icon: <Ruler className="w-6 h-6" />,
    duration: '單次測量',
    category: '柔軟度'
  },
  {
    id: 5,
    name: '8英呎起身繞行',
    description: '敏捷性與動態平衡評估',
    icon: <Timer className="w-6 h-6" />,
    duration: '計時測試',
    category: '平衡'
  },
  {
    id: 6,
    name: '原地站立抬膝',
    description: '2分鐘心肺耐力評估',
    icon: <Footprints className="w-6 h-6" />,
    duration: '2分鐘',
    category: '耐力'
  }
];

const TestPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  // Test states
  const [currentTestIndex, setCurrentTestIndex] = useState(null);
  const [currentPhase, setCurrentPhase] = useState('selection'); // selection, instructions, test, results, overall
  const [sessionId, setSessionId] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [allTestResults, setAllTestResults] = useState({});
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
  } = useMediaPipe(currentTestIndex ? TEST_CONFIGS[currentTestIndex - 1].name : '');
  
  // Detection hooks for all tests
  const chairStandHook = useChairStandDetection(currentTestIndex === 1 && currentPhase === 'test' ? currentLandmarks : null);
  const armCurlHook = useArmCurlDetection(currentTestIndex === 2 && currentPhase === 'test' ? currentLandmarks : null);
  const backScratchHook = useBackScratchDetection(currentTestIndex === 3 && currentPhase === 'test' ? currentLandmarks : null);
  const sitAndReachHook = useSitAndReachDetection(currentTestIndex === 4 && currentPhase === 'test' ? currentLandmarks : null);
  const eightFootHook = useEightFootUpAndGoDetection(currentTestIndex === 5 && currentPhase === 'test' ? currentLandmarks : null);
  const stepInPlaceHook = useStepInPlaceDetection(currentTestIndex === 6 && currentPhase === 'test' ? currentLandmarks : null);
  
  // Get current test hook based on index
  const getCurrentTestHook = () => {
    switch(currentTestIndex) {
      case 1: return chairStandHook;
      case 2: return armCurlHook;
      case 3: return backScratchHook;
      case 4: return sitAndReachHook;
      case 5: return eightFootHook;
      case 6: return stepInPlaceHook;
      default: return null;
    }
  };
  
  const currentTestHook = getCurrentTestHook();

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
      if (isInitialized) {
        stop();
      }
    };
  }, [isInitialized, stop]);

  // Handle phase change
  useEffect(() => {
    if (currentPhase !== 'test' && isInitialized) {
      stop();
    }
  }, [currentPhase, isInitialized, stop]);

  // Start test session (create once for all tests)
  const startTestSession = async () => {
    if (sessionId) return sessionId; // Return existing session
    
    try {
      const response = await fetch('http://localhost:3000/api/tests/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notes: `完整體適能評估 - ${new Date().toLocaleDateString()}`
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
    if (!currentTestHook || currentTestHook.testPhase !== 'ready' || isCameraLoading) {
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

    // Create session if needed
    const currentSessionId = await startTestSession();
    if (!currentSessionId) return;

    // Start test with countdown
    currentTestHook.startTest();
  };

  // Handle test completion
  useEffect(() => {
    const handleCompletion = async () => {
      if (currentPhase === 'test' && currentTestHook?.testPhase === 'completed' && sessionId) {
        await submitTestResults();
        if (isInitialized) {
          stop();
        }
      }
    };
    handleCompletion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTestHook?.testPhase, currentPhase]);

  // Stop the test
  const handleStopTest = async () => {
    if (currentTestHook) {
      currentTestHook.stopTest();
      if (sessionId) {
        await submitTestResults();
      }
      if (isInitialized) {
        stop();
      }
    }
  };

  // Get test score based on test type
  const getTestScore = () => {
    if (!currentTestHook) return 0;
    
    switch(currentTestIndex) {
      case 1: return currentTestHook.repCount; // Chair stand
      case 2: return currentTestHook.repCount; // Arm curl
      case 3: return currentTestHook.finalMeasurement || 0; // Back scratch
      case 4: return currentTestHook.finalMeasurement || 0; // Sit and reach
      case 5: return currentTestHook.finalTime || 0; // 8-foot up and go
      case 6: return currentTestHook.stepCount; // Step in place
      default: return 0;
    }
  };

  // Submit test results to backend
  const submitTestResults = async () => {
    if (!sessionId || isSubmitting || !currentTestIndex) return;

    setIsSubmitting(true);
    try {
      const userAge = calculateAge();
      const score = getTestScore();
      
      // Submit result
      const response = await fetch('http://localhost:3000/api/tests/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId: sessionId,
          testTypeId: currentTestIndex,
          score: score,
          userAge: userAge,
          userGender: user?.gender || 'male',
          rawData: {
            duration: TEST_CONFIGS[currentTestIndex - 1].duration,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) throw new Error('Failed to submit results');
      
      const data = await response.json();
      
      const result = {
        score: score,
        performanceLevel: data.data?.result?.performance_level || data.performanceLevel,
        percentile: data.data?.result?.percentile || data.percentile,
        age: userAge,
        gender: user?.gender || 'male'
      };
      
      setTestResults(result);
      setAllTestResults(prev => ({
        ...prev,
        [currentTestIndex]: result
      }));

      setCurrentPhase('results');
      toast.success('測試完成！');
    } catch (error) {
      console.error('Error submitting results:', error);
      toast.error('提交結果時發生錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete all tests and show overall results
  const completeAllTests = async () => {
    if (!sessionId) return;
    
    try {
      await fetch(`http://localhost:3000/api/tests/session/${sessionId}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setCurrentPhase('overall');
    } catch (error) {
      console.error('Error completing session:', error);
      toast.error('完成測試時發生錯誤');
    }
  };

  // Navigate to next test
  const goToNextTest = () => {
    if (currentTestIndex < 6) {
      setCurrentTestIndex(currentTestIndex + 1);
      setCurrentPhase('instructions');
      setTestResults(null);
      if (currentTestHook) {
        currentTestHook.resetTest();
      }
    } else {
      completeAllTests();
    }
  };

  // Reset test
  const handleReset = () => {
    if (currentTestHook) {
      currentTestHook.resetTest();
    }
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
      'excellent': 'text-green-600',
      'good': 'text-blue-600',
      'average': 'text-yellow-600',
      'fair': 'text-orange-600',
      'poor': 'text-red-600'
    };
    return colors[level] || 'text-gray-600';
  };
  
  // Get indicator position based on performance level
  const getIndicatorPosition = (level) => {
    const positions = {
      'poor': '10%',
      'fair': '30%',
      'average': '50%',
      'good': '70%',
      'excellent': '90%'
    };
    return positions[level] || '50%';
  };

  // Get test-specific instructions
  const getTestInstructions = () => {
    const instructions = {
      1: [
        '請坐在椅子上，雙腳平放地面，與肩同寬',
        '雙手交叉抱胸，保持背部挺直',
        '測試開始後，在30秒內盡可能多次完整站立和坐下',
        '確保每次站起時膝蓋完全伸直，坐下時完全接觸椅面',
        '系統會自動偵測並計算您的完成次數'
      ],
      2: [
        '坐在椅子上，背部貼緊椅背',
        '手持啞鈴或水瓶（女性5磅，男性8磅）',
        '手臂自然下垂，掌心朝前',
        '測試開始後，在30秒內盡可能多次完整彎曲手臂',
        '確保每次手臂完全伸直和彎曲'
      ],
      3: [
        '站立，將一隻手從肩膀上方伸向背部',
        '另一隻手從腰部向上伸向背部',
        '嘗試讓兩手手指相碰或重疊',
        '系統會測量兩手之間的距離',
        '保持姿勢5秒鐘進行測量'
      ],
      4: [
        '坐在椅子邊緣，一腿伸直，腳跟著地',
        '另一腿彎曲，腳掌平放地面',
        '雙手重疊，中指對齊',
        '慢慢向前彎腰，嘗試觸碰腳趾',
        '系統會測量手指與腳趾的距離'
      ],
      5: [
        '坐在椅子上，雙腳平放地面',
        '測試開始時，站起來',
        '快速走到前方8英呎（約2.4公尺）的標記處',
        '繞過標記返回椅子',
        '坐下，系統會記錄完成時間'
      ],
      6: [
        '站立，雙腳與肩同寬',
        '測試開始後，原地抬膝步行',
        '每次膝蓋抬至髖部中點高度',
        '持續2分鐘，盡可能多次抬膝',
        '系統會自動計算抬膝次數'
      ]
    };
    return instructions[currentTestIndex] || [];
  };

  // Render test-specific stats
  const renderTestStats = () => {
    if (!currentTestHook) return null;
    
    switch(currentTestIndex) {
      case 1: // Chair Stand
        return (
          <>
            <div className="bg-gradient-to-br from-red-500 to-orange-500 p-6 rounded-lg text-white">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-8 h-8" />
                <div className="text-3xl font-bold">{currentTestHook.timeRemaining}</div>
              </div>
              <div className="text-white/90">剩餘秒數</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-teal-500 p-6 rounded-lg text-white">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-8 h-8" />
                <div className="text-3xl font-bold">{currentTestHook.repCount}</div>
              </div>
              <div className="text-white/90">完成次數</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-6 rounded-lg text-white">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-8 h-8" />
                <div className="text-2xl font-bold">{currentTestHook.isStanding ? '站立' : '坐下'}</div>
              </div>
              <div className="text-white/90">目前狀態</div>
            </div>
          </>
        );
        
      case 2: // Arm Curl
        return (
          <>
            <div className="bg-gradient-to-br from-red-500 to-orange-500 p-6 rounded-lg text-white">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-8 h-8" />
                <div className="text-3xl font-bold">{currentTestHook.timeRemaining}</div>
              </div>
              <div className="text-white/90">剩餘秒數</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-teal-500 p-6 rounded-lg text-white">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-8 h-8" />
                <div className="text-3xl font-bold">{currentTestHook.repCount}</div>
              </div>
              <div className="text-white/90">完成次數</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-6 rounded-lg text-white">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-8 h-8" />
                <div className="text-2xl font-bold">{currentTestHook.isFlexed ? '彎曲' : '伸直'}</div>
              </div>
              <div className="text-white/90">手臂狀態</div>
            </div>
          </>
        );
        
      case 3: // Back Scratch
        return (
          <>
            <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-6 rounded-lg text-white">
              <div className="flex items-center gap-3 mb-2">
                <Ruler className="w-8 h-8" />
                <div className="text-3xl font-bold">{Math.abs(currentTestHook.distance).toFixed(1)}</div>
              </div>
              <div className="text-white/90">距離 (公分)</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-teal-500 p-6 rounded-lg text-white">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-8 h-8" />
                <div className="text-2xl font-bold">{currentTestHook.isOverlapping ? '重疊' : '未重疊'}</div>
              </div>
              <div className="text-white/90">手指狀態</div>
            </div>
          </>
        );
        
      case 4: // Sit and Reach
        return (
          <>
            <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-6 rounded-lg text-white">
              <div className="flex items-center gap-3 mb-2">
                <Ruler className="w-8 h-8" />
                <div className="text-3xl font-bold">{currentTestHook.reachDistance.toFixed(1)}</div>
              </div>
              <div className="text-white/90">前彎距離 (公分)</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-teal-500 p-6 rounded-lg text-white">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-8 h-8" />
                <div className="text-2xl font-bold">{currentTestHook.isReaching ? '前彎中' : '準備'}</div>
              </div>
              <div className="text-white/90">動作狀態</div>
            </div>
          </>
        );
        
      case 5: // 8-Foot Up and Go
        return (
          <>
            <div className="bg-gradient-to-br from-red-500 to-orange-500 p-6 rounded-lg text-white">
              <div className="flex items-center gap-3 mb-2">
                <Timer className="w-8 h-8" />
                <div className="text-3xl font-bold">{currentTestHook.elapsedTime}</div>
              </div>
              <div className="text-white/90">經過時間 (秒)</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-6 rounded-lg text-white">
              <div className="flex items-center gap-3 mb-2">
                <Footprints className="w-8 h-8" />
                <div className="text-2xl font-bold">
                  {currentTestHook.currentPosition === 'sitting' && '坐著'}
                  {currentTestHook.currentPosition === 'standing' && '站立'}
                  {currentTestHook.currentPosition === 'walking' && '行走'}
                  {currentTestHook.currentPosition === 'returning' && '返回'}
                </div>
              </div>
              <div className="text-white/90">目前位置</div>
            </div>
          </>
        );
        
      case 6: // Step in Place
        return (
          <>
            <div className="bg-gradient-to-br from-red-500 to-orange-500 p-6 rounded-lg text-white">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-8 h-8" />
                <div className="text-3xl font-bold">{currentTestHook.formattedTime}</div>
              </div>
              <div className="text-white/90">剩餘時間</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-teal-500 p-6 rounded-lg text-white">
              <div className="flex items-center gap-3 mb-2">
                <Footprints className="w-8 h-8" />
                <div className="text-3xl font-bold">{currentTestHook.stepCount}</div>
              </div>
              <div className="text-white/90">抬膝次數</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-6 rounded-lg text-white">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-8 h-8" />
                <div className="text-xl font-bold">
                  {currentTestHook.isSteppingLeft && '左腳'}
                  {currentTestHook.isSteppingRight && '右腳'}
                  {!currentTestHook.isSteppingLeft && !currentTestHook.isSteppingRight && '準備'}
                </div>
              </div>
              <div className="text-white/90">動作狀態</div>
            </div>
          </>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 p-4">
      <div className="max-w-6xl mx-auto">

        {/* Progress Indicator */}
        {currentTestIndex && currentPhase !== 'selection' && currentPhase !== 'overall' && (
          <div className="flex justify-center mb-8 gap-2">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <div
                key={num}
                className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all ${
                  num === currentTestIndex 
                    ? 'bg-white text-blue-600 shadow-lg scale-110' 
                    : num < currentTestIndex || allTestResults[num]
                    ? 'bg-white/40 text-white'
                    : 'bg-white/20 text-white/70'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-current opacity-20 flex items-center justify-center">
                  <span className="text-sm font-bold opacity-100">{num}</span>
                </div>
              </div>
            ))}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full ${
              currentPhase === 'overall' ? 'bg-white text-blue-600' : 'bg-white/20 text-white/70'
            }`}>
              <Award className="w-5 h-5" />
              <span className="font-medium">總結</span>
            </div>
          </div>
        )}

        {/* Phase Indicator for current test */}
        {currentTestIndex && currentPhase !== 'selection' && currentPhase !== 'overall' && (
          <div className="flex justify-center mb-6 gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              currentPhase === 'instructions' ? 'bg-white text-blue-600' : 'bg-white/20 text-white'
            }`}>
              <span className="font-medium">說明</span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              currentPhase === 'test' ? 'bg-white text-blue-600' : 'bg-white/20 text-white'
            }`}>
              <span className="font-medium">測試</span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              currentPhase === 'results' ? 'bg-white text-blue-600' : 'bg-white/20 text-white'
            }`}>
              <span className="font-medium">結果</span>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8">
          
          {/* Test Selection Phase */}
          {currentPhase === 'selection' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">體適能評估測試</h1>
                <p className="text-gray-600">請選擇要進行的測試項目</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {TEST_CONFIGS.map((test) => (
                  <button
                    key={test.id}
                    onClick={() => {
                      setCurrentTestIndex(test.id);
                      setCurrentPhase('instructions');
                    }}
                    className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-100 hover:shadow-lg transition-all hover:scale-105 text-left"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-500 text-white rounded-lg">
                        {test.icon}
                      </div>
                      <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        {test.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800 mb-2">{test.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{test.description}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{test.duration}</span>
                    </div>
                    {allTestResults[test.id] && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <span className="text-sm font-medium text-green-600">✓ 已完成</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              
              <div className="flex justify-center gap-4 mt-8">
                <button
                  onClick={() => navigate('/app')}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all flex items-center gap-2"
                >
                  <Home className="w-5 h-5" />
                  返回主頁
                </button>
                {Object.keys(allTestResults).length === 6 && (
                  <button
                    onClick={() => setCurrentPhase('overall')}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <Award className="w-5 h-5" />
                    查看總結報告
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Instructions Phase */}
          {currentPhase === 'instructions' && currentTestIndex && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  {TEST_CONFIGS[currentTestIndex - 1].name}
                </h1>
                <p className="text-gray-600">{TEST_CONFIGS[currentTestIndex - 1].description}</p>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-100">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-blue-600" />
                  測試說明
                </h2>
                <ul className="space-y-3 text-gray-700">
                  {getTestInstructions().map((instruction, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{instruction}</span>
                    </li>
                  ))}
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
                    setCurrentPhase('selection');
                    setCurrentTestIndex(null);
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all flex items-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  返回選擇
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
          {currentPhase === 'test' && currentTestHook && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  {TEST_CONFIGS[currentTestIndex - 1].name}
                </h1>
                <p className="text-gray-600">{TEST_CONFIGS[currentTestIndex - 1].description}</p>
              </div>
              
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
                {currentTestHook.countdown > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 pointer-events-none">
                    <div className="text-9xl font-bold text-white animate-pulse">
                      {currentTestHook.countdown}
                    </div>
                  </div>
                )}
              </div>

              {/* Control Buttons */}
              <div className="flex justify-center gap-4">
                {currentTestHook.testPhase === 'ready' ? (
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
                ) : currentTestHook.testPhase === 'testing' ? (
                  <>
                    <button
                      onClick={handleStopTest}
                      className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                    >
                      停止測試
                    </button>
                  </>
                ) : currentTestHook.testPhase === 'completed' ? (
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
                {renderTestStats()}
              </div>
            </div>
          )}

          {/* Results Phase */}
          {currentPhase === 'results' && testResults && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  {TEST_CONFIGS[currentTestIndex - 1].name} - 測試結果
                </h1>
              </div>
              
              {/* Main Score Card */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-100">
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-2">
                    <div className="text-6xl font-bold text-blue-600">{testResults.score}</div>
                    <div className="text-2xl text-gray-600">
                      {currentTestIndex <= 2 ? '次' : currentTestIndex <= 4 ? '公分' : currentTestIndex === 5 ? '秒' : '次'}
                    </div>
                  </div>
                </div>

                {/* Performance Meter */}
                <div className="mb-6">
                  <div className="text-center mb-4">
                    <span className="text-sm text-gray-600">表現等級：</span>
                    <span className={`text-2xl font-bold ml-2 ${getPerformanceBadgeColor(testResults.performanceLevel)}`}>
                      {getPerformanceLevelChinese(testResults.performanceLevel)}
                    </span>
                  </div>
                  
                  {/* Triangle Indicator Above Meter */}
                  {testResults.performanceLevel && (
                    <div className="relative h-8 mb-2">
                      <div 
                        className="absolute top-0"
                        style={{ left: getIndicatorPosition(testResults.performanceLevel), transform: 'translateX(-50%)' }}
                      >
                        <div className="text-sm font-bold text-cyan-600 mb-1">
                          {testResults.percentile}%
                        </div>
                        <svg width="24" height="16" viewBox="0 0 24 16" className="mx-auto">
                          <defs>
                            <linearGradient id="triangleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#22d3ee" />
                              <stop offset="100%" stopColor="#0ea5e9" />
                            </linearGradient>
                          </defs>
                          <path d="M12 16 L0 0 L24 0 Z" fill="url(#triangleGradient)" />
                        </svg>
                      </div>
                    </div>
                  )}
                  
                  <div className="relative h-12 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                    {/* 5 Level Segments with gradient colors */}
                    <div className="absolute inset-0 flex">
                      <div className="bg-gradient-to-r from-red-500 to-red-400 border-r border-white/50" style={{ width: '20%' }}></div>
                      <div className="bg-gradient-to-r from-orange-500 to-orange-400 border-r border-white/50" style={{ width: '20%' }}></div>
                      <div className="bg-gradient-to-r from-yellow-500 to-yellow-400 border-r border-white/50" style={{ width: '20%' }}></div>
                      <div className="bg-gradient-to-r from-blue-500 to-blue-400 border-r border-white/50" style={{ width: '20%' }}></div>
                      <div className="bg-gradient-to-r from-green-500 to-green-400" style={{ width: '20%' }}></div>
                    </div>
                    {/* Labels */}
                    <div className="absolute inset-0 flex items-center">
                      <div className="text-center text-xs font-medium text-white drop-shadow" style={{ width: '20%' }}>需改善</div>
                      <div className="text-center text-xs font-medium text-white drop-shadow" style={{ width: '20%' }}>尚可</div>
                      <div className="text-center text-xs font-medium text-white drop-shadow" style={{ width: '20%' }}>普通</div>
                      <div className="text-center text-xs font-medium text-white drop-shadow" style={{ width: '20%' }}>良好</div>
                      <div className="text-center text-xs font-medium text-white drop-shadow" style={{ width: '20%' }}>優秀</div>
                    </div>
                  </div>
                </div>

                {/* Key Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/80 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">年齡組別</div>
                    <div className="font-semibold text-gray-800">
                      {testResults.age}歲 {testResults.gender === 'male' ? '男性' : '女性'}
                    </div>
                  </div>
                  <div className="bg-white/80 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">同齡排名</div>
                    <div className="font-semibold text-gray-800">
                      {testResults.percentile ? `超越 ${testResults.percentile}% 同齡人` : '計算中...'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    setCurrentPhase('selection');
                    setCurrentTestIndex(null);
                    setTestResults(null);
                    if (currentTestHook) {
                      currentTestHook.resetTest();
                    }
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all flex items-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  返回選擇
                </button>
                <button
                  onClick={() => {
                    setCurrentPhase('instructions');
                    setTestResults(null);
                    if (currentTestHook) {
                      currentTestHook.resetTest();
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  重新測試
                </button>
                <button
                  onClick={goToNextTest}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
                >
                  {currentTestIndex < 6 ? '下一個測試' : '查看總結'}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Overall Results Phase */}
          {currentPhase === 'overall' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">體適能評估總結報告</h1>
                <p className="text-gray-600">您的完整體適能評估結果</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {TEST_CONFIGS.map((test) => {
                  const result = allTestResults[test.id];
                  if (!result) return null;
                  
                  return (
                    <div key={test.id} className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-500 text-white rounded-lg">
                          {test.icon}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">{test.name}</h3>
                          <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            {test.category}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">成績：</span>
                          <span className="text-2xl font-bold text-blue-600">
                            {result.score}
                            <span className="text-sm text-gray-600 ml-1">
                              {test.id <= 2 ? '次' : test.id <= 4 ? 'cm' : test.id === 5 ? '秒' : '次'}
                            </span>
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">等級：</span>
                          <span className={`font-bold ${getPerformanceBadgeColor(result.performanceLevel)}`}>
                            {getPerformanceLevelChinese(result.performanceLevel)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">百分比：</span>
                          <span className="font-semibold text-gray-800">
                            {result.percentile}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Overall Summary */}
              <div className="bg-gradient-to-br from-green-50 to-teal-50 p-6 rounded-lg border border-green-100">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Award className="w-6 h-6 text-green-600" />
                  整體評估
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {Object.keys(allTestResults).length}
                    </div>
                    <div className="text-sm text-gray-600">完成測試</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {Object.values(allTestResults).filter(r => r.performanceLevel === 'excellent' || r.performanceLevel === 'good').length}
                    </div>
                    <div className="text-sm text-gray-600">優良項目</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600">
                      {Object.values(allTestResults).filter(r => r.performanceLevel === 'average').length}
                    </div>
                    <div className="text-sm text-gray-600">普通項目</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">
                      {Object.values(allTestResults).filter(r => r.performanceLevel === 'fair' || r.performanceLevel === 'poor').length}
                    </div>
                    <div className="text-sm text-gray-600">需改善項目</div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    setCurrentPhase('selection');
                    setCurrentTestIndex(null);
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all flex items-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  返回測試選擇
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
                    if (isInitialized) {
                      stop();
                    }
                    navigate('/app');
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Home className="w-5 h-5" />
                  返回主頁
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