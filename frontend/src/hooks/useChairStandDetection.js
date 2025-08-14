import { useState, useCallback, useRef, useEffect } from 'react';

export const useChairStandDetection = (landmarks) => {
  const [isStanding, setIsStanding] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [isTestActive, setIsTestActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [testPhase, setTestPhase] = useState('ready'); // 'ready', 'countdown', 'testing', 'completed'
  
  const lastPositionRef = useRef('sitting');
  const countdownIntervalRef = useRef(null);
  const testTimerRef = useRef(null);
  const kneeAnglesRef = useRef({ left: 0, right: 0 });
  const isTimerRunningRef = useRef(false);

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

  // Detect chair stand position based on knee angles
  const detectChairStand = useCallback(() => {
    if (!landmarks || landmarks.length < 33 || !isTestActive) return;

    // Calculate knee angles
    const leftKneeAngle = calculateAngle(
      landmarks[23], // left hip
      landmarks[25], // left knee
      landmarks[27]  // left ankle
    );
    
    const rightKneeAngle = calculateAngle(
      landmarks[24], // right hip
      landmarks[26], // right knee
      landmarks[28]  // right ankle
    );

    // Store angles for reference
    kneeAnglesRef.current = {
      left: leftKneeAngle || 0,
      right: rightKneeAngle || 0
    };

    // Use average of both knee angles for detection
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

    // Standing: knee angle > 160 degrees (nearly straight)
    // Sitting: knee angle < 100 degrees (bent)
    const STANDING_THRESHOLD = 150;
    const SITTING_THRESHOLD = 120;

    const currentPosition = avgKneeAngle > STANDING_THRESHOLD ? 'standing' : 
                           avgKneeAngle < SITTING_THRESHOLD ? 'sitting' : 
                           lastPositionRef.current;

    // Count reps when transitioning from sitting to standing
    if (lastPositionRef.current === 'sitting' && currentPosition === 'standing') {
      setRepCount(prev => prev + 1);
      setIsStanding(true);
    } else if (currentPosition === 'sitting') {
      setIsStanding(false);
    }

    lastPositionRef.current = currentPosition;
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
    setRepCount(0);
    setTimeRemaining(30);
    lastPositionRef.current = 'sitting';

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
        
        // Start test timer (30 seconds)
        let timeValue = 30;
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
    setTimeRemaining(30);
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
    setRepCount(0);
    setIsStanding(false);
    setIsTestActive(false);
    setTestPhase('ready');
    setCountdown(0);
    setTimeRemaining(30);
    lastPositionRef.current = 'sitting';
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
      detectChairStand();
    }
  }, [landmarks, isTestActive, detectChairStand]);

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
    isStanding,
    repCount,
    isTestActive,
    startTest,
    stopTest,
    resetTest,
    countdown,
    timeRemaining,
    testPhase,
    kneeAngles: kneeAnglesRef.current
  };
};