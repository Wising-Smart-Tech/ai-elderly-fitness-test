import React, { useState, useEffect } from 'react';

const Results = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/tests/results`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTestIcon = (testType) => {
    const icons = {
      'chair_stand': '🪑',
      'arm_curl': '💪',
      'back_scratch': '🤸',
      'sit_reach': '🦵',
      'up_and_go': '🚶',
      'step_in_place': '🏃'
    };
    return icons[testType] || '📋';
  };

  const filteredResults = selectedFilter === 'all' 
    ? results 
    : results.filter(result => result.testType === selectedFilter);

  const testTypes = [
    { value: 'all', label: 'All Tests' },
    { value: 'chair_stand', label: 'Chair Stand' },
    { value: 'arm_curl', label: 'Arm Curl' },
    { value: 'back_scratch', label: 'Back Scratch' },
    { value: 'sit_reach', label: 'Sit and Reach' },
    { value: 'up_and_go', label: '8-Foot Up and Go' },
    { value: 'step_in_place', label: 'Step in Place' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card variant="elevated" size="medium">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="text-gray-600">Loading your results...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card variant="elevated" size="large">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Test Results</h1>
              <p className="text-gray-600 mt-1">View your fitness assessment history and progress</p>
            </div>
            <Button
              onClick={() => window.location.href = '/app'}
              variant="primary"
              size="large"
            >
              New Test
            </Button>
          </div>
        </Card>

        {/* Filter Tabs */}
        <Card variant="flat" size="medium">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {testTypes.map(type => (
              <Button
                key={type.value}
                onClick={() => setSelectedFilter(type.value)}
                variant={selectedFilter === type.value ? 'primary' : 'outline'}
                size="medium"
              >
                {type.label}
              </Button>
            ))}
          </div>
        </Card>
        
        {/* Results Grid */}
        {filteredResults.length === 0 ? (
          <Card 
            variant="elevated" 
            size="large"
            emptyState={{
              icon: '📋',
              title: 'No test results found',
              description: selectedFilter === 'all' 
                ? 'Complete your first fitness test to see results here'
                : `No results for ${testTypes.find(t => t.value === selectedFilter)?.label}`,
              action: {
                label: 'Start Testing',
                onClick: () => window.location.href = '/app'
              }
            }}
          />
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredResults.map((result, index) => (
              <TestResultCard
                key={index}
                testName={result.testName || result.testType}
                date={new Date(result.createdAt)}
                score={result.score}
                performanceLevel={result.performanceLevel}
                percentile={result.percentile}
                duration={result.duration}
                notes={result.notes}
                icon={getTestIcon(result.testType)}
                variant="elevated"
                size="large"
                trend={
                  index > 0 && filteredResults[index - 1]?.testType === result.testType
                    ? result.score > filteredResults[index - 1].score ? 'up' : 'down'
                    : null
                }
              />
            ))}
          </div>
        )}

        {/* Summary Statistics */}
        {results.length > 0 && (
          <Card variant="elevated" size="large">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Overall Summary</h2>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 uppercase tracking-wider">Total Tests</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{results.length}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 uppercase tracking-wider">Best Performance</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {results.filter(r => r.performanceLevel === 'excellent' || r.performanceLevel === 'good').length}
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 uppercase tracking-wider">Average Score</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length)}
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600 uppercase tracking-wider">Latest Test</p>
                <p className="text-lg font-bold text-purple-600 mt-1">
                  {new Date(results[0]?.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Results;