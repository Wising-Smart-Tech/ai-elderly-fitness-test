import { useState, useCallback, useRef, useEffect } from 'react';

export const useStepInPlaceDetection = (landmarks) => {
  const [stepCount, setStepCount] = useState(0);
  const [isSteppingLeft, setIsSteppingLeft] = useState(false);
  const [isSteppingRight, setIsSteppingRight] = useState(false);
  const [isTestActive, setIsTestActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes
  const [testPhase, setTestPhase] = useState('ready'); // 'ready', 'countdown', 'testing', 'completed'
  
  const lastLeftKneeRef = useRef('down');
  const lastRightKneeRef = useRef('down');
  const countdownIntervalRef = useRef(null);
  const testTimerRef = useRef(null);
  const kneeHeightsRef = useRef({ left: 0, right: 0 });
  const isTimerRunningRef = useRef(false);
  const hipMidpointRef = useRef(null);

  // Calculate distance between two points
  const calculateDistance = (point1, point2) => {
    if (!point1 || !point2) return null;
    
    const dy = Math.abs(point1.y - point2.y);
    return dy;
  };

  // Detect step in place based on knee height relative to hip
  const detectStepInPlace = useCallback(() => {
    if (!landmarks || landmarks.length < 33 || !isTestActive) return;

    // Get key landmarks
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    
    // Calculate hip midpoint height
    const hipMidpoint = (leftHip.y + rightHip.y) / 2;
    
    // Store hip midpoint for reference
    if (!hipMidpointRef.current) {
      hipMidpointRef.current = hipMidpoint;
    }
    
    // Calculate knee heights relative to hip midpoint
    const leftKneeHeight = hipMidpoint - leftKnee.y; // Positive when knee is raised
    const rightKneeHeight = hipMidpoint - rightKnee.y;
    
    // Store knee heights for display
    kneeHeightsRef.current = {
      left: leftKneeHeight,
      right: rightKneeHeight
    };
    
    // Threshold for detecting a step (knee raised above hip midpoint)
    const STEP_THRESHOLD = 0; // Knee at or above hip midpoint
    const RESET_THRESHOLD = -0.05; // Knee below hip midpoint (down position)
    
    // Detect left knee step
    const leftKneePosition = leftKneeHeight > STEP_THRESHOLD ? 'up' : 
                            leftKneeHeight < RESET_THRESHOLD ? 'down' : 
                            lastLeftKneeRef.current;
    
    // Count left step when knee goes from down to up
    if (lastLeftKneeRef.current === 'down' && leftKneePosition === 'up') {
      setStepCount(prev => prev + 1);
      setIsSteppingLeft(true);
    } else if (leftKneePosition === 'down') {
      setIsSteppingLeft(false);
    }
    
    // Detect right knee step
    const rightKneePosition = rightKneeHeight > STEP_THRESHOLD ? 'up' : 
                             rightKneeHeight < RESET_THRESHOLD ? 'down' : 
                             lastRightKneeRef.current;
    
    // Count right step when knee goes from down to up
    if (lastRightKneeRef.current === 'down' && rightKneePosition === 'up') {
      setStepCount(prev => prev + 1);
      setIsSteppingRight(true);
    } else if (rightKneePosition === 'down') {
      setIsSteppingRight(false);
    }
    
    lastLeftKneeRef.current = leftKneePosition;
    lastRightKneeRef.current = rightKneePosition;
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
    if (testTimerRef.current) {
      clearInterval(testTimerRef.current);
      testTimerRef.current = null;
    }
    
    isTimerRunningRef.current = true;
    setTestPhase('countdown');
    setCountdown(3);
    setStepCount(0);
    setTimeRemaining(120);
    lastLeftKneeRef.current = 'down';
    lastRightKneeRef.current = 'down';
    hipMidpointRef.current = null;

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
        
        // Start test timer (120 seconds / 2 minutes)
        let timeValue = 120;
        testTimerRef.current = setInterval(() => {
          timeValue--;
          setTimeRemaining(timeValue);
          
          if (timeValue <= 0) {
            // Test completed
            clearInterval(testTimerRef.current);
            testTimerRef.current = null;
            isTimerRunningRef.current = false;
            setIsTestActive(false);
            setTestPhase('completed');
          }
        }, 1000);
      }
    }, 1000);
  }, []);

  // Stop test
  const stopTest = useCallback(() => {
    setIsTestActive(false);
    setTestPhase('ready');
    setCountdown(0);
    setTimeRemaining(120);
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

  // Reset test
  const resetTest = useCallback(() => {
    setStepCount(0);
    setIsSteppingLeft(false);
    setIsSteppingRight(false);
    setIsTestActive(false);
    setTestPhase('ready');
    setCountdown(0);
    setTimeRemaining(120);
    lastLeftKneeRef.current = 'down';
    lastRightKneeRef.current = 'down';
    hipMidpointRef.current = null;
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

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Run detection when landmarks update
  useEffect(() => {
    if (isTestActive && landmarks) {
      detectStepInPlace();
    }
  }, [landmarks, isTestActive, detectStepInPlace]);

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
    stepCount,
    isSteppingLeft,
    isSteppingRight,
    isTestActive,
    startTest,
    stopTest,
    resetTest,
    countdown,
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    testPhase,
    kneeHeights: kneeHeightsRef.current
  };
};