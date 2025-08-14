import { useState, useCallback, useRef, useEffect } from 'react';

export const useArmCurlDetection = (landmarks) => {
  const [isFlexed, setIsFlexed] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [isTestActive, setIsTestActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [testPhase, setTestPhase] = useState('ready'); // 'ready', 'countdown', 'testing', 'completed'
  
  const lastPositionRef = useRef('extended');
  const countdownIntervalRef = useRef(null);
  const testTimerRef = useRef(null);
  const elbowAnglesRef = useRef({ left: 0, right: 0 });
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

  // Detect arm curl position based on elbow angles
  const detectArmCurl = useCallback(() => {
    if (!landmarks || landmarks.length < 33 || !isTestActive) return;

    // Calculate elbow angles
    const leftElbowAngle = calculateAngle(
      landmarks[11], // left shoulder
      landmarks[13], // left elbow
      landmarks[15]  // left wrist
    );
    
    const rightElbowAngle = calculateAngle(
      landmarks[12], // right shoulder
      landmarks[14], // right elbow
      landmarks[16]  // right wrist
    );

    // Store angles for reference
    elbowAnglesRef.current = {
      left: leftElbowAngle || 0,
      right: rightElbowAngle || 0
    };

    // Use the dominant arm or average for detection
    const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

    // Flexed: elbow angle < 50 degrees (bent)
    // Extended: elbow angle > 140 degrees (nearly straight)
    const FLEXED_THRESHOLD = 60;
    const EXTENDED_THRESHOLD = 130;

    const currentPosition = avgElbowAngle < FLEXED_THRESHOLD ? 'flexed' : 
                           avgElbowAngle > EXTENDED_THRESHOLD ? 'extended' : 
                           lastPositionRef.current;

    // Count reps when transitioning from extended to flexed
    if (lastPositionRef.current === 'extended' && currentPosition === 'flexed') {
      setRepCount(prev => prev + 1);
      setIsFlexed(true);
    } else if (currentPosition === 'extended') {
      setIsFlexed(false);
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
    lastPositionRef.current = 'extended';

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
    setIsFlexed(false);
    setIsTestActive(false);
    setTestPhase('ready');
    setCountdown(0);
    setTimeRemaining(30);
    lastPositionRef.current = 'extended';
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
      detectArmCurl();
    }
  }, [landmarks, isTestActive, detectArmCurl]);

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
    isFlexed,
    repCount,
    isTestActive,
    startTest,
    stopTest,
    resetTest,
    countdown,
    timeRemaining,
    testPhase,
    elbowAngles: elbowAnglesRef.current
  };
};