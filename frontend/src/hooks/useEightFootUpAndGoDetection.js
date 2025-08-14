import { useState, useCallback, useRef, useEffect } from 'react';

export const useEightFootUpAndGoDetection = (landmarks) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [isTestActive, setIsTestActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [testPhase, setTestPhase] = useState('ready'); // 'ready', 'countdown', 'testing', 'completed'
  const [finalTime, setFinalTime] = useState(null);
  const [currentPosition, setCurrentPosition] = useState('sitting'); // 'sitting', 'standing', 'walking', 'turning', 'returning'
  
  const countdownIntervalRef = useRef(null);
  const testTimerRef = useRef(null);
  const startTimeRef = useRef(null);
  const isTimerRunningRef = useRef(false);
  const hipPositionsRef = useRef([]);
  const initialHipPositionRef = useRef(null);
  const maxDistanceRef = useRef(0);

  // Calculate angle between three points
  const calculateAngle = (a, b, c) => {
    if (!a || !b || !c) return null;
    
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    
    return angle;
  };

  // Calculate distance between two points
  const calculateDistance = (point1, point2) => {
    if (!point1 || !point2) return null;
    
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Detect movement and position
  const detectMovement = useCallback(() => {
    if (!landmarks || landmarks.length < 33 || !isTestActive) return;

    // Get key landmarks
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    
    // Calculate hip center position
    const hipCenter = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };
    
    // Store initial position
    if (!initialHipPositionRef.current) {
      initialHipPositionRef.current = hipCenter;
    }
    
    // Calculate knee angles to detect standing/sitting
    const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
    
    // Detect if standing (knee angle > 150)
    const isStandingNow = avgKneeAngle > 150;
    
    // Calculate movement distance from initial position
    const distanceFromStart = calculateDistance(hipCenter, initialHipPositionRef.current);
    
    // Track maximum distance (to detect if person reached the marker)
    if (distanceFromStart > maxDistanceRef.current) {
      maxDistanceRef.current = distanceFromStart;
    }
    
    // Determine current position/phase
    if (!isStandingNow && distanceFromStart < 0.1) {
      setCurrentPosition('sitting');
      setIsMoving(false);
    } else if (isStandingNow && distanceFromStart < 0.15) {
      setCurrentPosition('standing');
      setIsMoving(false);
    } else if (distanceFromStart > 0.15 && distanceFromStart <= maxDistanceRef.current) {
      setCurrentPosition('walking');
      setIsMoving(true);
    } else if (distanceFromStart < maxDistanceRef.current * 0.8 && maxDistanceRef.current > 0.3) {
      setCurrentPosition('returning');
      setIsMoving(true);
    }
    
    // Check if test is complete (returned to sitting position)
    if (currentPosition === 'returning' && !isStandingNow && distanceFromStart < 0.1) {
      // Test completed
      completeTest();
    }
    
    // Store hip positions for movement tracking
    hipPositionsRef.current.push(hipCenter);
    if (hipPositionsRef.current.length > 60) { // Keep last 2 seconds of data
      hipPositionsRef.current.shift();
    }
  }, [landmarks, isTestActive, currentPosition]);

  // Complete the test
  const completeTest = useCallback(() => {
    if (startTimeRef.current) {
      const endTime = Date.now();
      const totalTime = (endTime - startTimeRef.current) / 1000; // Convert to seconds
      setFinalTime(Math.round(totalTime * 10) / 10); // Round to 1 decimal
      
      clearInterval(testTimerRef.current);
      testTimerRef.current = null;
      isTimerRunningRef.current = false;
      setIsTestActive(false);
      setTestPhase('completed');
    }
  }, []);

  // Start test with countdown
  const startTest = useCallback(() => {
    // Prevent multiple starts
    if (isTimerRunningRef.current) {
      return;
    }
    
    // Clear any existing intervals first
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (testTimerRef.current) {
      clearInterval(testTimerRef.current);
      testTimerRef.current = null;
    }
    
    isTimerRunningRef.current = true;
    setTestPhase('countdown');
    setCountdown(3);
    setElapsedTime(0);
    setFinalTime(null);
    setCurrentPosition('sitting');
    initialHipPositionRef.current = null;
    maxDistanceRef.current = 0;
    hipPositionsRef.current = [];

    // Start countdown
    let countdownValue = 3;
    countdownIntervalRef.current = setInterval(() => {
      countdownValue--;
      setCountdown(countdownValue);
      
      if (countdownValue <= 0) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        
        // Start actual test after countdown
        setTestPhase('testing');
        setIsTestActive(true);
        startTimeRef.current = Date.now();
        
        // Update elapsed time display
        testTimerRef.current = setInterval(() => {
          const currentTime = Date.now();
          const elapsed = (currentTime - startTimeRef.current) / 1000;
          setElapsedTime(Math.round(elapsed * 10) / 10);
          
          // Safety timeout at 30 seconds
          if (elapsed > 30) {
            completeTest();
          }
        }, 100);
      }
    }, 1000);
  }, [completeTest]);

  // Stop test
  const stopTest = useCallback(() => {
    // Calculate final time if test was active
    if (isTestActive && startTimeRef.current) {
      const endTime = Date.now();
      const totalTime = (endTime - startTimeRef.current) / 1000;
      setFinalTime(Math.round(totalTime * 10) / 10);
    }
    
    setIsTestActive(false);
    setTestPhase('ready');
    setCountdown(0);
    isTimerRunningRef.current = false;
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (testTimerRef.current) {
      clearInterval(testTimerRef.current);
      testTimerRef.current = null;
    }
  }, [isTestActive]);

  // Reset test
  const resetTest = useCallback(() => {
    setElapsedTime(0);
    setIsMoving(false);
    setIsTestActive(false);
    setTestPhase('ready');
    setCountdown(0);
    setFinalTime(null);
    setCurrentPosition('sitting');
    initialHipPositionRef.current = null;
    maxDistanceRef.current = 0;
    hipPositionsRef.current = [];
    startTimeRef.current = null;
    isTimerRunningRef.current = false;
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (testTimerRef.current) {
      clearInterval(testTimerRef.current);
      testTimerRef.current = null;
    }
  }, []);

  // Run detection when landmarks update
  useEffect(() => {
    if (isTestActive && landmarks) {
      detectMovement();
    }
  }, [landmarks, isTestActive, detectMovement]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (testTimerRef.current) {
        clearInterval(testTimerRef.current);
      }
    };
  }, []);

  return {
    elapsedTime,
    isMoving,
    currentPosition,
    finalTime,
    isTestActive,
    startTest,
    stopTest,
    resetTest,
    countdown,
    testPhase
  };
};