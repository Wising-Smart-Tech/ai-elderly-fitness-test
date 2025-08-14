import { useState, useCallback, useRef, useEffect } from 'react';

export const useBackScratchDetection = (landmarks) => {
  const [distance, setDistance] = useState(0);
  const [isOverlapping, setIsOverlapping] = useState(false);
  const [isTestActive, setIsTestActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [testPhase, setTestPhase] = useState('ready'); // 'ready', 'countdown', 'testing', 'completed'
  const [finalMeasurement, setFinalMeasurement] = useState(null);
  
  const countdownIntervalRef = useRef(null);
  const measurementTimeoutRef = useRef(null);
  const isTimerRunningRef = useRef(false);
  const measurementsRef = useRef([]);

  // Calculate distance between two points
  const calculateDistance = (point1, point2) => {
    if (!point1 || !point2) return null;
    
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    const dz = point1.z - point2.z || 0;
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  // Detect back scratch position (hands behind back)
  const detectBackScratch = useCallback(() => {
    if (!landmarks || landmarks.length < 33 || !isTestActive) return;

    // Get wrist positions
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    
    // Calculate distance between wrists
    const wristDistance = calculateDistance(leftWrist, rightWrist);
    
    if (wristDistance !== null) {
      // Convert to centimeters (approximate based on shoulder width)
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const shoulderWidth = calculateDistance(leftShoulder, rightShoulder);
      
      // Assume average shoulder width is ~40cm
      const distanceInCm = (wristDistance / shoulderWidth) * 40;
      
      setDistance(Math.round(distanceInCm * 10) / 10); // Round to 1 decimal
      
      // Check if hands overlap (negative distance means overlap)
      if (distanceInCm < 2) {
        setIsOverlapping(true);
      } else {
        setIsOverlapping(false);
      }
      
      // Store measurement
      measurementsRef.current.push(distanceInCm);
      
      // Keep only last 30 measurements (about 1 second of data)
      if (measurementsRef.current.length > 30) {
        measurementsRef.current.shift();
      }
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
    setDistance(0);
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
        
        // Take measurement after 5 seconds of stabilization
        measurementTimeoutRef.current = setTimeout(() => {
          // Calculate average of recent measurements
          if (measurementsRef.current.length > 0) {
            const avgDistance = measurementsRef.current.reduce((a, b) => a + b, 0) / measurementsRef.current.length;
            setFinalMeasurement(Math.round(avgDistance * 10) / 10);
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
      const avgDistance = measurementsRef.current.reduce((a, b) => a + b, 0) / measurementsRef.current.length;
      setFinalMeasurement(Math.round(avgDistance * 10) / 10);
    }
  }, []);

  // Reset test
  const resetTest = useCallback(() => {
    setDistance(0);
    setIsOverlapping(false);
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
      detectBackScratch();
    }
  }, [landmarks, isTestActive, detectBackScratch]);

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
    distance,
    isOverlapping,
    finalMeasurement,
    isTestActive,
    startTest,
    stopTest,
    resetTest,
    countdown,
    testPhase
  };
};