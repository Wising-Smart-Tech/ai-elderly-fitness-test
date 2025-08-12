// src/hooks/useMediaPipe.js
import { useRef, useEffect, useState, useCallback } from 'react';
import { Camera } from '@mediapipe/camera_utils';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

export const useMediaPipe = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [landmarks, setLandmarks] = useState(null);

  const onResults = useCallback((results) => {
    if (!canvasRef.current) return;

    const canvasCtx = canvasRef.current.getContext('2d');
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Draw the camera image
    canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

    if (results.poseLandmarks) {
      // Draw pose connections
      drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: '#00FF00',
        lineWidth: 4
      });
      
      // Draw landmarks
      drawLandmarks(canvasCtx, results.poseLandmarks, {
        color: '#FF0000',
        lineWidth: 2,
        radius: 6
      });

      setLandmarks(results.poseLandmarks);
    }

    canvasCtx.restore();
  }, []);

  const initializePose = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const pose = new Pose({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
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

      return pose;
    } catch (err) {
      setError('Failed to initialize MediaPipe Pose');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [onResults]);

  const initializeCamera = useCallback(async () => {
    try {
      if (!videoRef.current || !poseRef.current) {
        throw new Error('Video element or pose not ready');
      }

      setIsLoading(true);
      setError(null);

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (poseRef.current && isInitialized) {
            await poseRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480
      });

      await camera.start();
      cameraRef.current = camera;
      
      // Set canvas dimensions
      if (canvasRef.current) {
        canvasRef.current.width = 640;
        canvasRef.current.height = 480;
      }

      setIsInitialized(true);
      return camera;
    } catch (err) {
      setError('Failed to initialize camera');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  const startCamera = useCallback(async () => {
    try {
      await initializePose();
      await initializeCamera();
    } catch (err) {
      console.error('Camera initialization error:', err);
      setError(err.message);
    }
  }, [initializePose, initializeCamera]);

  const stopCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    setIsInitialized(false);
    setLandmarks(null);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    landmarks,
    isInitialized,
    isLoading,
    error,
    startCamera,
    stopCamera
  };
};