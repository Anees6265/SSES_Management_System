/* eslint-disable react/prop-types */
import { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { toast } from 'react-toastify';
import CryptoJS from 'crypto-js';
import OrangeButton from '../../shared/sidebar/OrangeButton';

const FaceLogin = ({ onLoginSuccess, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const videoRef = useRef();
  const canvasRef = useRef();
  const detectionInterval = useRef();

  useEffect(() => {
    loadModels();
    return () => {
      stopCamera();
    };
  }, []);

  const loadModels = async () => {
    try {
      setIsLoading(true);
      const MODEL_URL = '/models';
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      
      setModelsLoaded(true);
    } catch (error) {
      console.error('Error loading models:', error);
      toast.error('Failed to load face recognition models');
    } finally {
      setIsLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      // Mobile-optimized camera settings
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: isMobile ? 320 : 480 },
          height: { ideal: isMobile ? 240 : 360 },
          facingMode: 'user',
          frameRate: { ideal: isMobile ? 10 : 15, max: isMobile ? 15 : 20 }
        } 
      });
      videoRef.current.srcObject = stream;
      setIsCapturing(true);
      
      videoRef.current.onloadedmetadata = () => {
        // Small delay to ensure video is ready
        setTimeout(() => {
          startFaceDetection();
        }, 500);
      };
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    stopFaceDetection();
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
    setFaceDetected(false);
    setCountdown(0);
  };

  const detectFace = useCallback(async () => {
    if (!modelsLoaded || !videoRef.current) return;

    try {
      // Optimized detection with smaller input size for speed
      const detections = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({
          inputSize: 320, // Smaller input for faster processing
          scoreThreshold: 0.3 // Lower threshold for better detection
        }));

      if (detections) {
        setFaceDetected(true);
        // Simplified drawing for better performance
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Draw green box around detected face
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 3;
          const box = detections.box;
          ctx.strokeRect(box.x, box.y, box.width, box.height);
        }
      } else {
        setFaceDetected(false);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    } catch (error) {
      console.error('Face detection error:', error);
    }
  }, [modelsLoaded]);

  const startFaceDetection = useCallback(() => {
    if (detectionInterval.current) clearInterval(detectionInterval.current);
    detectionInterval.current = setInterval(detectFace, 200); // Reduced frequency for better performance
  }, [detectFace]);

  const stopFaceDetection = useCallback(() => {
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
      detectionInterval.current = null;
    }
  }, []);

  const captureAndLogin = async () => {
    if (!modelsLoaded || !videoRef.current || !faceDetected) {
      toast.error('Please position your face clearly in the camera');
      return;
    }

    if (attempts >= 3) {
      toast.error('Maximum attempts reached. Please try again later.');
      stopCamera();
      onClose();
      return;
    }

    try {
      setIsLoading(true);
      setAttempts(prev => prev + 1);
      
      // Start countdown
      setCountdown(3);
      for (let i = 3; i > 0; i--) {
        setCountdown(i);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      setCountdown(0);
      
      // Mobile-optimized face capture
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      const detections = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({
          inputSize: isMobile ? 224 : 320, // Smaller for mobile
          scoreThreshold: isMobile ? 0.4 : 0.3 // Stricter for mobile
        }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) {
        toast.error('No face detected during capture. Please try again.');
        return;
      }

      // Simplified liveness detection for better performance
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 160; // Smaller canvas for faster processing
      canvas.height = 120;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      
      // Quick brightness check only
      let brightness = 0;
      const sampleSize = pixels.length / 16; // Sample every 16th pixel for speed
      for (let i = 0; i < pixels.length; i += 16) {
        brightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      }
      
      const avgBrightness = brightness / sampleSize;
      
      if (avgBrightness < 20 || avgBrightness > 235) {
        toast.error('Poor lighting conditions. Please adjust lighting.');
        return;
      }

      const faceDescriptor = Array.from(detections.descriptor);

      const response = await fetch(`${import.meta.env.VITE_API_URL.replace('/api', '')}/api/face-auth/login-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ faceDescriptor }),
      });

      const data = await response.json();

      if (data.success) {
        const secretKey = "ITEG@123";
        const encryptedToken = CryptoJS.AES.encrypt(data.token, secretKey).toString();
        
        localStorage.setItem('token', encryptedToken);
        localStorage.setItem('role', data.user.role);
        localStorage.setItem('positionRole', data.user.position);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userEmail', data.user.email);
        localStorage.setItem('userName', data.user.name);
        
        const roleText = data.user.role === 'superadmin' ? 'Super Admin' : 
                        data.user.role === 'admin' ? 'Admin' : 'Faculty';
        toast.success(`🎉 Face login successful! Welcome ${data.user.name} (${roleText})`);
        stopCamera();
        onLoginSuccess(data.user);
      } else {
        toast.error(data.message || `Face not recognized (Attempt ${attempts}/3)`);
      }
    } catch (error) {
      console.error('Face login error:', error);
      toast.error('Face login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
  return (
    <OrangeButton
      isOpen={true}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      panelTitle="Face Authentication"
      panelSubtitle="Verification via facial recognition"
      showFooter={false}
      drawerContent={
        <div className="space-y-6 py-2">
          {!modelsLoaded ? (
            <div className="text-center py-12">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FDA92D] border-t-transparent mx-auto mb-4"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#FDA92D] to-[#FED680] opacity-20 animate-pulse"></div>
              </div>
              <p className="text-gray-600 font-medium">Initializing Face Recognition...</p>
              <p className="text-sm text-gray-500 mt-2">Please wait while AI models load</p>
            </div>
          ) : (
            <>
              <div className="relative overflow-hidden rounded-xl border-4 border-orange-200 shadow-lg">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  className="w-full h-72 bg-gray-100 object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                />
                
                <div className="absolute top-3 left-3 flex gap-2">
                  <div className="bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${isCapturing ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
                    {isCapturing ? 'Live' : 'Offline'}
                  </div>
                  {faceDetected && (
                    <div className="bg-green-600/90 text-white px-3 py-1 rounded-full text-xs font-medium">
                      ✓ Face Detected
                    </div>
                  )}
                </div>
                
                {countdown > 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-5xl font-bold text-white animate-pulse">
                      {countdown}
                    </div>
                  </div>
                )}
                
                {isCapturing && !faceDetected && (
                  <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 bg-amber-500/90 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Position face in camera
                  </div>
                )}
              </div>

              <div className="text-center space-y-4">
                {!isCapturing ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="w-full bg-[#FDA92D] text-white py-3 rounded-xl hover:bg-orange-600 font-semibold transition"
                  >
                    Start Camera
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center text-xs text-gray-600">
                      Attempts: {attempts}/3 {faceDetected ? '• Face Ready ✓' : '• Position Face'}
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={captureAndLogin}
                        disabled={isLoading || !faceDetected || attempts >= 3}
                        className="flex-1 bg-[#FDA92D] text-white py-3 rounded-xl hover:bg-orange-600 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? 'Processing...' : countdown > 0 ? `📸 ${countdown}` : 'Authenticate'}
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-5 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      }
    />
  );
};

export default FaceLogin;