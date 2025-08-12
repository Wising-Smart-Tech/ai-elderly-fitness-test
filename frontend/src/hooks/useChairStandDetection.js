// src/hooks/useChairStandDetection.js
import { useState, useEffect, useRef } from 'react';

export const useChairStandDetection = (landmarks, isActive) => {
  const [repCount, setRepCount] = useState(0);
  const [isStanding, setIsStanding] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('準備');
  
  const lastHipY = useRef(0);
  const lastStateChange = useRef(0);

  useEffect(() => {
    if (!landmarks || !isActive) return;

    const now = Date.now();
    
    // Get hip landmarks (average of left and right hip)
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    if (!leftHip || !rightHip) return;
    
    const currentHipY = (leftHip.y + rightHip.y) / 2;

    // Initialize baseline
    if (lastHipY.current === 0) {
      lastHipY.current = currentHipY;
      return;
    }

    // Calculate movement threshold
    const movementThreshold = 0.08;
    const timeSinceLastChange = now - lastStateChange.current;

    // Detect standing up (hip moves up significantly)
    if (!isStanding && (lastHipY.current - currentHipY) > movementThreshold && timeSinceLastChange > 1000) {
      setIsStanding(true);
      lastStateChange.current = now;
      setCurrentStatus('站立');
    }
    // Detect sitting down (hip moves down significantly)
    else if (isStanding && (currentHipY - lastHipY.current) > movementThreshold && timeSinceLastChange > 1000) {
      setIsStanding(false);
      lastStateChange.current = now;
      setRepCount(prev => prev + 1);
      setCurrentStatus('坐下');
    }

    lastHipY.current = currentHipY;
  }, [landmarks, isActive, isStanding]);

  const resetDetection = () => {
    setRepCount(0);
    setIsStanding(false);
    setCurrentStatus('準備');
    lastHipY.current = 0;
    lastStateChange.current = 0;
  };

  return {
    repCount,
    currentStatus,
    resetDetection
  };
};
