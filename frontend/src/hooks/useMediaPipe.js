import { useRef, useCallback, useEffect, useState } from 'react';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';

export const useMediaPipe = (testType = 'chair_stand') => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentLandmarks, setCurrentLandmarks] = useState(null);

  // Define which landmarks to show for each test type
  const getRelevantConnections = (testType) => {
    const connections = {
      chair_stand: [
        // Hip to knee connections
        [23, 25], // left hip to left knee
        [24, 26], // right hip to right knee
        // Knee to ankle connections
        [25, 27], // left knee to left ankle
        [26, 28], // right knee to right ankle
        // Hip connections
        [23, 24], // left hip to right hip
        // Ankle to foot connections
        [27, 29], // left ankle to left heel
        [27, 31], // left ankle to left foot index
        [28, 30], // right ankle to right heel
        [28, 32], // right ankle to right foot index
      ],
      arm_curl: [
        // Shoulder to elbow connections
        [11, 13], // left shoulder to left elbow
        [12, 14], // right shoulder to right elbow
        // Elbow to wrist connections
        [13, 15], // left elbow to left wrist
        [14, 16], // right elbow to right wrist
      ],
      back_scratch: [
        // Upper body connections for flexibility
        [11, 12], // shoulders
        [11, 13], [12, 14], // shoulder to elbow
        [13, 15], [14, 16], // elbow to wrist
      ],
      sit_and_reach: [
        // Lower body flexibility
        [23, 24], // hips
        [23, 25], [24, 26], // hip to knee
        [25, 27], [26, 28], // knee to ankle
        // Add hands for reaching
        [15, 19], [16, 20], // wrist to pinky
        [15, 17], [16, 18], // wrist to index
      ],
      eight_foot_up_and_go: [
        // Full lower body for walking
        [23, 24], // hips
        [23, 25], [24, 26], // hip to knee
        [25, 27], [26, 28], // knee to ankle
        [27, 29], [28, 30], // ankle to heel
        [27, 31], [28, 32], // ankle to foot index
      ],
      step_in_place: [
        // Lower body for knee lifts
        [23, 24], // hips
        [23, 25], [24, 26], // hip to knee
        [25, 27], [26, 28], // knee to ankle
      ]
    };
    return connections[testType] || connections.chair_stand;
  };

  // Define which landmarks to highlight for each test
  const getRelevantLandmarks = (testType) => {
    const landmarks = {
      chair_stand: [23, 24, 25, 26, 27, 28, 29, 30, 31, 32], // hips, knees, ankles, feet
      arm_curl: [11, 12, 13, 14, 15, 16], // shoulders, elbows, wrists
      back_scratch: [11, 12, 13, 14, 15, 16], // upper body
      sit_and_reach: [15, 16, 17, 18, 19, 20, 23, 24, 25, 26, 27, 28], // hands and lower body
      eight_foot_up_and_go: [23, 24, 25, 26, 27, 28, 29, 30, 31, 32], // full lower body
      step_in_place: [23, 24, 25, 26, 27, 28] // hips, knees, ankles
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

    // Draw video frame
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

      // Draw connections (skeleton lines)
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
          ctx.strokeStyle = '#00FF00';
          ctx.lineWidth = 5;
          ctx.stroke();
        }
      });

      // Draw landmarks (dots)
      filteredLandmarks.forEach((_, index) => {
        const originalIndex = relevantLandmarks[index];
        if (results.poseLandmarks[originalIndex]) {
          const point = results.poseLandmarks[originalIndex];
          ctx.beginPath();
          ctx.arc(
            point.x * canvas.width,
            point.y * canvas.height,
            8,
            0,
            2 * Math.PI
          );
          ctx.fillStyle = '#FF0000';
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // Draw angle visualization for chair stand
      if (testType === 'chair_stand') {
        // Calculate and display knee angles
        const leftKneeAngle = calculateAngle(
          results.poseLandmarks[23], // left hip
          results.poseLandmarks[25], // left knee
          results.poseLandmarks[27]  // left ankle
        );
        const rightKneeAngle = calculateAngle(
          results.poseLandmarks[24], // right hip
          results.poseLandmarks[26], // right knee
          results.poseLandmarks[28]  // right ankle
        );

        // Display knee angles on screen
        ctx.font = '20px Arial';
        ctx.fillStyle = '#FFFF00';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        
        if (leftKneeAngle) {
          const leftKnee = results.poseLandmarks[25];
          const text = `L: ${Math.round(leftKneeAngle)}�`;
          ctx.strokeText(text, leftKnee.x * canvas.width - 50, leftKnee.y * canvas.height - 10);
          ctx.fillText(text, leftKnee.x * canvas.width - 50, leftKnee.y * canvas.height - 10);
        }
        
        if (rightKneeAngle) {
          const rightKnee = results.poseLandmarks[26];
          const text = `R: ${Math.round(rightKneeAngle)}�`;
          ctx.strokeText(text, rightKnee.x * canvas.width + 10, rightKnee.y * canvas.height - 10);
          ctx.fillText(text, rightKnee.x * canvas.width + 10, rightKnee.y * canvas.height - 10);
        }
      }
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