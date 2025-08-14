import { useState, useCallback, useRef, useEffect } from 'react';

export const useSitAndReachDetection = (landmarks) => {
  const [reachDistance, setReachDistance] = useState(0);
  const [isReaching, setIsReaching] = useState(false);
  const [isTestActive, setIsTestActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [testPhase, setTestPhase] = useState('ready'); // 'ready', 'countdown', 'testing', 'completed'
  const [finalMeasurement, setFinalMeasurement] = useState(null);
  
  const countdownIntervalRef = useRef(null);
  const measurementTimeoutRef = useRef(null);
  const isTimerRunningRef = useRef(false);
  const measurementsRef = useRef([]);
  const hipAngleRef = useRef(0);

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

  // Detect sit and reach position
  const detectSitAndReach = useCallback(() => {
    if (!landmarks || landmarks.length < 33 || !isTestActive) return;

    // Get key landmarks
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    // Calculate hip angle (forward bend)
    const leftHipAngle = calculateAngle(
      leftShoulder,
      leftHip,
      leftAnkle
    );
    
    const rightHipAngle = calculateAngle(
      rightShoulder,
      rightHip,
      rightAnkle
    );
    
    const avgHipAngle = (leftHipAngle + rightHipAngle) / 2;
    hipAngleRef.current = avgHipAngle;
    
    // Check if person is reaching forward (hip angle < 120 degrees)
    if (avgHipAngle < 120) {
      setIsReaching(true);
      
      // Calculate reach distance (wrist position relative to ankle)
      const avgWristX = (leftWrist.x + rightWrist.x) / 2;
      const avgWristY = (leftWrist.y + rightWrist.y) / 2;
      const avgAnkleX = (leftAnkle.x + rightAnkle.x) / 2;
      const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
      
      // Calculate horizontal distance (positive = past toes, negative = before toes)
      const horizontalDistance = avgWristX - avgAnkleX;
      
      // Convert to centimeters (approximate based on body proportions)
      const shoulderWidth = calculateDistance(leftShoulder, rightShoulder);
      const distanceInCm = (horizontalDistance / shoulderWidth) * 40; // Assume shoulder width ~40cm
      
      setReachDistance(Math.round(distanceInCm * 10) / 10);
      
      // Store measurement
      measurementsRef.current.push(distanceInCm);
      
      // Keep only last 30 measurements
      if (measurementsRef.current.length > 30) {
        measurementsRef.current.shift();
      }
    } else {
      setIsReaching(false);
    }
  }, [landmarks, isTestActive]);

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
    if (measurementTimeoutRef.current) {
      clearTimeout(measurementTimeoutRef.current);
      measurementTimeoutRef.current = null;
    }
    
    isTimerRunningRef.current = true;
    setTestPhase('countdown');
    setCountdown(3);
    setReachDistance(0);
    setFinalMeasurement(null);
    measurementsRef.current = [];

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
        
        // Take measurement after 5 seconds of reaching
        measurementTimeoutRef.current = setTimeout(() => {
          // Calculate best (furthest) measurement
          if (measurementsRef.current.length > 0) {
            const bestReach = Math.max(...measurementsRef.current);
            setFinalMeasurement(Math.round(bestReach * 10) / 10);
          }
          
          isTimerRunningRef.current = false;
          setIsTestActive(false);
          setTestPhase('completed');
        }, 5000);
      }
    }, 1000);
  }, []);

  // Stop test
  const stopTest = useCallback(() => {
    setIsTestActive(false);
    setTestPhase('ready');
    setCountdown(0);
    isTimerRunningRef.current = false;
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (measurementTimeoutRef.current) {
      clearTimeout(measurementTimeoutRef.current);
      measurementTimeoutRef.current = null;
    }
    
    // Calculate final measurement if stopped early
    if (measurementsRef.current.length > 0) {
      const bestReach = Math.max(...measurementsRef.current);
      setFinalMeasurement(Math.round(bestReach * 10) / 10);
    }
  }, []);

  // Reset test
  const resetTest = useCallback(() => {
    setReachDistance(0);
    setIsReaching(false);
    setIsTestActive(false);
    setTestPhase('ready');
    setCountdown(0);
    setFinalMeasurement(null);
    measurementsRef.current = [];
    isTimerRunningRef.current = false;
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (measurementTimeoutRef.current) {
      clearTimeout(measurementTimeoutRef.current);
      measurementTimeoutRef.current = null;
    }
  }, []);

  // Run detection when landmarks update
  useEffect(() => {
    if (isTestActive && landmarks) {
      detectSitAndReach();
    }
  }, [landmarks, isTestActive, detectSitAndReach]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (measurementTimeoutRef.current) {
        clearTimeout(measurementTimeoutRef.current);
      }
    };
  }, []);

  return {
    reachDistance,
    isReaching,
    finalMeasurement,
    isTestActive,
    startTest,
    stopTest,
    resetTest,
    countdown,
    testPhase,
    hipAngle: hipAngleRef.current
  };
};