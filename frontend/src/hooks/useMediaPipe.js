import { useRef, useCallback, useEffect, useState } from 'react';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';

export const useMediaPipe = (testName = '') => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentLandmarks, setCurrentLandmarks] = useState(null);

  // Map test names to test types
  const getTestType = (name) => {
    const mapping = {
      '椅子坐立測試': 'chair_stand',
      '肱二頭肌手臂屈舉': 'arm_curl',
      '抓背測驗': 'back_scratch',
      '椅子坐姿體前彎': 'sit_and_reach',
      '8英呎起身繞行': 'eight_foot_up_and_go',
      '原地站立抬膝': 'step_in_place'
    };
    return mapping[name] || 'chair_stand';
  };

  const testType = getTestType(testName);

  // Define which landmarks to show for each test type
  const getRelevantConnections = (testType) => {
    const connections = {
      chair_stand: [
        // Core body for stability
        [11, 12], // shoulders
        [11, 23], [12, 24], // shoulder to hip
        [23, 24], // hip connection
        // Lower body focus
        [23, 25], [24, 26], // hip to knee
        [25, 27], [26, 28], // knee to ankle
        [27, 29], [28, 30], // ankle to heel
        [27, 31], [28, 32], // ankle to foot index
        [29, 31], [30, 32], // heel to foot index
      ],
      arm_curl: [
        // Upper body focus
        [11, 12], // shoulders
        [11, 13], [12, 14], // shoulder to elbow
        [13, 15], [14, 16], // elbow to wrist
        // Add hand details for grip
        [15, 17], [16, 18], // wrist to index
        [15, 19], [16, 20], // wrist to pinky
        [17, 19], [18, 20], // index to pinky
        // Core for stability
        [11, 23], [12, 24], // shoulder to hip
      ],
      back_scratch: [
        // Full upper body for flexibility assessment
        [11, 12], // shoulders
        [11, 13], [12, 14], // shoulder to elbow
        [13, 15], [14, 16], // elbow to wrist
        // Hands
        [15, 17], [16, 18], // wrist to index
        [15, 19], [16, 20], // wrist to pinky
        [15, 21], [16, 22], // wrist to thumb
        // Core connection
        [11, 23], [12, 24], // shoulder to hip
        [23, 24], // hip connection
      ],
      sit_and_reach: [
        // Core and spine
        [11, 12], // shoulders
        [11, 23], [12, 24], // shoulder to hip
        [23, 24], // hips
        // Lower body for sitting position
        [23, 25], [24, 26], // hip to knee
        [25, 27], [26, 28], // knee to ankle
        [27, 29], [28, 30], // ankle to heel
        [27, 31], [28, 32], // ankle to foot index
        // Arms and hands for reaching
        [11, 13], [12, 14], // shoulder to elbow
        [13, 15], [14, 16], // elbow to wrist
        [15, 17], [16, 18], // wrist to index
        [15, 19], [16, 20], // wrist to pinky
      ],
      eight_foot_up_and_go: [
        // Full body for walking assessment
        [11, 12], // shoulders
        [11, 23], [12, 24], // shoulder to hip
        [23, 24], // hips
        // Full lower body
        [23, 25], [24, 26], // hip to knee
        [25, 27], [26, 28], // knee to ankle
        [27, 29], [28, 30], // ankle to heel
        [27, 31], [28, 32], // ankle to foot index
        [29, 31], [30, 32], // heel to foot index
        // Arms for balance
        [11, 13], [12, 14], // shoulder to elbow
        [13, 15], [14, 16], // elbow to wrist
      ],
      step_in_place: [
        // Core for balance
        [11, 12], // shoulders
        [11, 23], [12, 24], // shoulder to hip
        [23, 24], // hips
        // Lower body focus for knee lifts
        [23, 25], [24, 26], // hip to knee (key for this test)
        [25, 27], [26, 28], // knee to ankle
        [27, 29], [28, 30], // ankle to heel
        [27, 31], [28, 32], // ankle to foot index
        // Arms for balance
        [11, 13], [12, 14], // shoulder to elbow
        [13, 15], [14, 16], // elbow to wrist
      ]
    };
    return connections[testType] || connections.chair_stand;
  };

  // Define which landmarks to highlight for each test
  const getRelevantLandmarks = (testType) => {
    const landmarks = {
      chair_stand: [
        11, 12, // shoulders (for posture)
        23, 24, // hips (key points)
        25, 26, // knees (key points for angle)
        27, 28, // ankles
        29, 30, 31, 32 // feet
      ],
      arm_curl: [
        11, 12, // shoulders (anchor points)
        13, 14, // elbows (key points for angle)
        15, 16, // wrists (movement points)
        17, 18, 19, 20, 21, 22 // hand points
      ],
      back_scratch: [
        11, 12, // shoulders
        13, 14, // elbows
        15, 16, // wrists (key measurement points)
        17, 18, 19, 20, 21, 22, // hands
        23, 24 // hips for reference
      ],
      sit_and_reach: [
        11, 12, // shoulders
        15, 16, 17, 18, 19, 20, // hands (reaching points)
        23, 24, // hips (pivot points)
        25, 26, // knees
        27, 28, 29, 30, 31, 32 // ankles and feet (target points)
      ],
      eight_foot_up_and_go: [
        11, 12, // shoulders (for balance)
        13, 14, 15, 16, // arms
        23, 24, // hips (center of movement)
        25, 26, // knees
        27, 28, 29, 30, 31, 32 // full lower body for walking
      ],
      step_in_place: [
        11, 12, // shoulders (for balance)
        13, 14, 15, 16, // arms
        23, 24, // hips (reference for knee height)
        25, 26, // knees (key measurement points)
        27, 28, 29, 30, 31, 32 // ankles and feet
      ]
    };
    return landmarks[testType] || landmarks.chair_stand;
  };

  const onResults = useCallback((results) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match video
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    // Clear canvas
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply mirror transformation
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);

    // Draw video frame (mirrored)
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.poseLandmarks) {
      setCurrentLandmarks(results.poseLandmarks);

      // Get relevant connections and landmarks for the test type
      const relevantConnections = getRelevantConnections(testType);
      const relevantLandmarks = getRelevantLandmarks(testType);

      // Filter landmarks to only show relevant ones
      const filteredLandmarks = results.poseLandmarks.filter((_, index) => 
        relevantLandmarks.includes(index)
      );

      // Set up gradient for lines
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(34, 211, 238, 0.8)'); // cyan-400 with opacity
      gradient.addColorStop(0.5, 'rgba(14, 165, 233, 0.8)'); // sky-500 with opacity
      gradient.addColorStop(1, 'rgba(20, 184, 166, 0.8)'); // teal-500 with opacity

      // Draw connections (skeleton lines) with gradient
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      relevantConnections.forEach(([start, end]) => {
        if (results.poseLandmarks[start] && results.poseLandmarks[end]) {
          ctx.beginPath();
          ctx.moveTo(
            results.poseLandmarks[start].x * canvas.width,
            results.poseLandmarks[start].y * canvas.height
          );
          ctx.lineTo(
            results.poseLandmarks[end].x * canvas.width,
            results.poseLandmarks[end].y * canvas.height
          );
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      });

      // Draw landmarks (dots) with cohesive design
      filteredLandmarks.forEach((_, index) => {
        const originalIndex = relevantLandmarks[index];
        if (results.poseLandmarks[originalIndex]) {
          const point = results.poseLandmarks[originalIndex];
          const x = point.x * canvas.width;
          const y = point.y * canvas.height;
          
          // Outer glow effect
          ctx.beginPath();
          ctx.arc(
            x,
            y,
            12,
            0,
            2 * Math.PI
          );
          const glowGradient = ctx.createRadialGradient(
            x,
            y,
            0,
            x,
            y,
            12
          );
          glowGradient.addColorStop(0, 'rgba(34, 211, 238, 0.4)');
          glowGradient.addColorStop(1, 'rgba(34, 211, 238, 0)');
          ctx.fillStyle = glowGradient;
          ctx.fill();
          
          // Inner dot
          ctx.beginPath();
          ctx.arc(
            x,
            y,
            6,
            0,
            2 * Math.PI
          );
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(14, 165, 233, 0.8)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    }

    ctx.restore();
  }, [testType]);

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

  const initialize = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const pose = new Pose({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        },
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      pose.onResults(onResults);
      poseRef.current = pose;

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (poseRef.current && videoRef.current) {
            await poseRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480
      });

      cameraRef.current = camera;
      await camera.start();
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing MediaPipe:', error);
    }
  }, [onResults]);

  const stop = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (poseRef.current) {
      poseRef.current.close();
      poseRef.current = null;
    }
    setIsInitialized(false);
    setCurrentLandmarks(null);
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    videoRef,
    canvasRef,
    initialize,
    stop,
    isInitialized,
    currentLandmarks,
    calculateAngle
  };
};