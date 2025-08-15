import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, TrendingUp, Calendar, Award,
  Activity, Target, Zap, Clock, BarChart3,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine, Area
} from 'recharts';
import toast from 'react-hot-toast';

const Results = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const tabContainerRef = useRef(null);
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    // Save scroll position before fetching
    if (tabContainerRef.current) {
      scrollPositionRef.current = tabContainerRef.current.scrollLeft;
    }
    
    fetchResults();
  }, [selectedFilter]);

  // Check scroll indicators
  useEffect(() => {
    const checkScrollIndicators = () => {
      if (tabContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = tabContainerRef.current;
        setShowLeftScroll(scrollLeft > 0);
        setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 5);
      }
    };

    checkScrollIndicators();
    window.addEventListener('resize', checkScrollIndicators);
    
    return () => window.removeEventListener('resize', checkScrollIndicators);
  }, [results]);

  const fetchResults = async () => {
    try {
      const url = selectedFilter === 'all' 
        ? 'http://localhost:3000/api/tests/results'
        : `http://localhost:3000/api/tests/results?testType=${selectedFilter}`;
        
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        
        // Restore scroll position after data loads
        if (tabContainerRef.current && scrollPositionRef.current) {
          tabContainerRef.current.scrollLeft = scrollPositionRef.current;
        }
      } else {
        toast.error('無法載入測試結果');
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('載入測試結果時發生錯誤');
    } finally {
      setInitialLoading(false);
    }
  };

  // Process data for charts
  const processChartData = (testTypeId) => {
    const filteredResults = results
      .filter(r => r.testTypeId === testTypeId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map(r => ({
        date: new Date(r.createdAt).toLocaleDateString('zh-TW', { 
          month: '2-digit', 
          day: '2-digit' 
        }),
        score: parseFloat(r.score), // Convert to number
        level: r.performanceLevel,
        testTypeId: testTypeId // Add testTypeId for tooltip
      }));
    
    return filteredResults;
  };

  // Calculate statistics for a test type
  const calculateStats = (testTypeId) => {
    const testResults = results
      .filter(r => r.testTypeId === testTypeId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort by date descending
    
    if (testResults.length === 0) return null;
    
    const scores = testResults.map(r => parseFloat(r.score)); // Convert to number
    const latest = scores[0]; // First element is the most recent
    const best = testTypeId === 5 ? Math.min(...scores) : Math.max(...scores); // Lower is better for 8-foot up and go
    const average = (scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(1);
    
    return { latest, best, average, count: scores.length };
  };

  // Get test icon based on test type
  const getTestIcon = (testTypeId) => {
    switch(testTypeId) {
      case 1: return <Activity className="w-5 h-5" />;
      case 2: return <TrendingUp className="w-5 h-5" />;
      case 3: return <Target className="w-5 h-5" />;
      case 4: return <Zap className="w-5 h-5" />;
      case 5: return <Clock className="w-5 h-5" />;
      case 6: return <BarChart3 className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  // Get performance level thresholds (example values, adjust based on actual data)
  const getPerformanceLevels = (testTypeId) => {
    const levels = {
      1: { poor: 8, fair: 11, average: 13, good: 15, excellent: 17 }, // Chair stand
      2: { poor: 11, fair: 13, average: 15, good: 17, excellent: 19 }, // Arm curl
      3: { poor: -8, fair: -4, average: -1, good: 2, excellent: 4 }, // Back scratch
      4: { poor: -8, fair: -4, average: -1, good: 2, excellent: 4 }, // Sit and reach
      5: { poor: 9, fair: 8, average: 7, good: 6, excellent: 5 }, // 8-foot up and go (lower is better)
      6: { poor: 65, fair: 73, average: 80, good: 87, excellent: 94 } // Step in place
    };
    return levels[testTypeId] || {};
  };

  const testTypes = [
    { value: 'all', label: '全部測試' },
    { value: '1', label: '椅子坐立' },
    { value: '2', label: '手臂屈舉' },
    { value: '3', label: '抓背測驗' },
    { value: '4', label: '體前彎' },
    { value: '5', label: '起身繞行' },
    { value: '6', label: '原地抬膝' }
  ];

  // Scroll functions for filter tabs
  const scrollTabs = (direction) => {
    if (tabContainerRef.current) {
      const scrollAmount = 200;
      const newScrollLeft = direction === 'left' 
        ? tabContainerRef.current.scrollLeft - scrollAmount
        : tabContainerRef.current.scrollLeft + scrollAmount;
      
      tabContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
      
      // Save the new scroll position
      scrollPositionRef.current = newScrollLeft;
      
      // Update scroll indicators after scrolling
      setTimeout(() => {
        if (tabContainerRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = tabContainerRef.current;
          setShowLeftScroll(scrollLeft > 0);
          setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 5);
        }
      }, 300);
    }
  };

  const handleTabClick = (value) => {
    setSelectedFilter(value);
  };

  const testInfo = {
    1: { name: '椅子坐立測試', unit: '次', color: '#3B82F6' },
    2: { name: '肱二頭肌手臂屈舉', unit: '次', color: '#10B981' },
    3: { name: '抓背測驗', unit: '公分', color: '#8B5CF6' },
    4: { name: '椅子坐姿體前彎', unit: '公分', color: '#F59E0B' },
    5: { name: '8英呎起身繞行', unit: '秒', color: '#EF4444' },
    6: { name: '原地站立抬膝', unit: '次', color: '#06B6D4' }
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-lg font-bold" style={{ color: payload[0].color }}>
            {payload[0].value} {testInfo[payload[0].payload.testTypeId]?.unit}
          </p>
        </div>
      );
    }
    return null;
  };

  // Render individual chart
  const renderChart = (testTypeId, isLarge = false) => {
    const data = processChartData(testTypeId);
    const stats = calculateStats(testTypeId);
    const info = testInfo[testTypeId];
    const levels = getPerformanceLevels(testTypeId);
    
    if (!data || data.length === 0) return null;
    
    const chartHeight = isLarge ? 300 : 200;
    
    return (
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} 
                 style={{ backgroundColor: `${info.color}20` }}>
              {getTestIcon(testTypeId)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">{info.name}</h3>
              <p className="text-sm text-gray-500">共 {stats.count} 次測試</p>
            </div>
          </div>
        </div>
        
        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">最新</p>
            <p className="text-lg font-bold text-gray-800">{stats.latest}</p>
            <p className="text-xs text-gray-500">{info.unit}</p>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-500">最佳</p>
            <p className="text-lg font-bold text-blue-600">{stats.best}</p>
            <p className="text-xs text-gray-500">{info.unit}</p>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <p className="text-xs text-gray-500">平均</p>
            <p className="text-lg font-bold text-green-600">{stats.average}</p>
            <p className="text-xs text-gray-500">{info.unit}</p>
          </div>
        </div>
        
        {/* Chart */}
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              stroke="#6B7280"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#6B7280"
              domain={['dataMin - 2', 'dataMax + 2']}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Performance level reference lines (only for large charts) */}
            {isLarge && Object.entries(levels).map(([level, value]) => (
              <ReferenceLine 
                key={level} 
                y={value} 
                stroke="#D1D5DB" 
                strokeDasharray="3 3"
                label={{ value: level === 'excellent' ? '優秀' : level === 'good' ? '良好' : '', 
                        position: 'right', fontSize: 10 }}
              />
            ))}
            
            <Line 
              type="monotone" 
              dataKey="score" 
              stroke={info.color}
              strokeWidth={2}
              dot={{ fill: info.color, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Only show loading on initial page load
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600">載入測試結果中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 p-4">
      <div className="max-w-7xl mx-auto">
        
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
                <h1 className="text-2xl font-bold text-gray-800">進度追蹤</h1>
                <p className="text-gray-600 text-sm mt-1">查看您的體適能測試進度</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/app/test/chair-stand')}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:shadow-lg transition-all"
            >
              開始新測試
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl mb-6 sticky top-4 z-10">
          <div className="relative flex items-center h-16">
            {/* Left scroll button */}
            {showLeftScroll && (
              <button
                onClick={() => scrollTabs('left')}
                className="absolute left-2 z-20 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            
            {/* Tabs container */}
            <div 
              ref={tabContainerRef}
              className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-12 h-full"
              onScroll={(e) => {
                const { scrollLeft, scrollWidth, clientWidth } = e.target;
                setShowLeftScroll(scrollLeft > 0);
                setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 5);
                // Save current scroll position
                scrollPositionRef.current = scrollLeft;
              }}
              style={{
                scrollBehavior: 'auto',
                WebkitOverflowScrolling: 'touch',
                msOverflowStyle: 'none',
                scrollbarWidth: 'none'
              }}
            >
              {testTypes.map((type, index) => (
                <button
                  key={type.value}
                  onClick={() => handleTabClick(type.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                    selectedFilter === type.value 
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            
            {/* Right scroll button */}
            {showRightScroll && (
              <button
                onClick={() => scrollTabs('right')}
                className="absolute right-2 z-20 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Charts Grid */}
        {results.length === 0 ? (
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-4">
                <BarChart3 className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {selectedFilter === 'all' ? '尚無測試記錄' : '此類型尚無測試記錄'}
              </h3>
              <p className="text-gray-600 mb-6">
                完成測試後即可查看進度圖表
              </p>
              <button
                onClick={() => navigate('/app/test/chair-stand')}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:shadow-lg transition-all"
              >
                開始測試
              </button>
            </div>
          </div>
        ) : (
          <div className={selectedFilter === 'all' ? 'grid md:grid-cols-2 gap-6' : ''}>
            {selectedFilter === 'all' ? (
              // Show all test charts in grid
              [1, 2, 3, 4, 5, 6].map(testTypeId => {
                const chartData = processChartData(testTypeId);
                if (chartData.length > 0) {
                  return (
                    <div key={testTypeId}>
                      {renderChart(testTypeId, false)}
                    </div>
                  );
                }
                return null;
              })
            ) : (
              // Show single large chart for selected test
              renderChart(parseInt(selectedFilter), true)
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;