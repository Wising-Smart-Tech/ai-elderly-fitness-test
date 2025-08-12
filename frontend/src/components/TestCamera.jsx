// src/components/TestCamera.jsx
import React, { useEffect } from 'react';
import { useMediaPipe } from '../hooks/useMediaPipe';
import { Loader2 } from 'lucide-react';

const TestCamera = ({ onLandmarksUpdate, className = '' }) => {
  const {
    videoRef,
    canvasRef,
    landmarks,
    isInitialized,
    isLoading,
    error,
    startCamera,
    stopCamera
  } = useMediaPipe();

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (onLandmarksUpdate && landmarks) {
      onLandmarksUpdate(landmarks);
    }
  }, [landmarks, onLandmarksUpdate]);

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 text-center ${className}`}>
        <p className="text-red-700 font-medium">攝影機錯誤</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={startCamera}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          重試
        </button>
      </div>
    );
  }

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center text-white">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>初始化攝影機中...</p>
          </div>
        </div>
      )}
      
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        muted
        playsInline
      />
      
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
      />
      
      {!isInitialized && !isLoading && !error && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center">
          <button
            onClick={startCamera}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            啟動攝影機
          </button>
        </div>
      )}
    </div>
  );
};

export default TestCamera;