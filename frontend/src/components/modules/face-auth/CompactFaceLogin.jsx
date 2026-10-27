/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapiModule from 'face-api.js';
const faceapi = faceapiModule.default || faceapiModule;
import { toast } from 'react-toastify';
import CryptoJS from 'crypto-js';
import { ScanFace, Camera, CheckCircle2, AlertCircle, RefreshCw, Loader2, Sparkles, UserX } from 'lucide-react';
import OrangeButton from '../../shared/sidebar/OrangeButton';
import { API_BASE_URL } from '../../../config/apiConfig';

const CompactFaceLogin = ({ onLoginSuccess, onClose, onNoFaceRegistered }) => {
  // Status: 'loading_models' | 'ready' | 'starting_camera' | 'scanning' | 'authenticating' | 'success' | 'failed' | 'not_detected'
  const [status, setStatus] = useState('loading_models');
  const [statusMessage, setStatusMessage] = useState('Loading Face ID models...');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [scanSecondsLeft, setScanSecondsLeft] = useState(15);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const isScanningActiveRef = useRef(false);

  const loadModels = useCallback(async () => {
    try {
      // If already loaded in memory, transition directly to ready
      if (
        faceapi.nets.tinyFaceDetector.isLoaded &&
        faceapi.nets.faceLandmark68Net.isLoaded &&
        faceapi.nets.faceRecognitionNet.isLoaded
      ) {
        setModelsLoaded(true);
        setStatus('ready');
        setStatusMessage('Ready to authenticate with Face ID');
        return;
      }

      setStatus('loading_models');
      setStatusMessage('Loading AI face models...');
      
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);

      setModelsLoaded(true);
      setStatus('ready');
      setStatusMessage('Ready to authenticate with Face ID');
    } catch (error) {
      console.error('Face-api models load error:', error);
      setStatus('failed');
      setStatusMessage(error?.message ? `Model error: ${error.message}` : 'Failed to load face recognition models');
      toast.error('Face recognition models could not be loaded. Please refresh or retry.');
    }
  }, []);

  // Load models on component mount
  useEffect(() => {
    loadModels();

    return () => {
      cleanupCamera();
    };
  }, [loadModels]);

  // Cleanup helper
  const cleanupCamera = useCallback(() => {
    isScanningActiveRef.current = false;

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.error('Error stopping stream tracks:', e);
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      try {
        if (videoRef.current.srcObject) {
          const tracks = videoRef.current.srcObject.getTracks();
          tracks.forEach((track) => track.stop());
          videoRef.current.srcObject = null;
        }
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      } catch (e) {
        console.error('Error cleaning video element:', e);
      }
    }
  }, []);

  // Start Camera Stream
  const startCameraStream = async () => {
    cleanupCamera();

    const constraints = {
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
      
      // Wait for video frame readiness
      return new Promise((resolve) => {
        if (videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
          resolve(true);
        } else {
          videoRef.current.onloadeddata = () => resolve(true);
        }
      });
    }
    return true;
  };

  // Perform Face Authentication API Call
  const authenticateFace = async (descriptor) => {
    isScanningActiveRef.current = false;
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setStatus('authenticating');
    setStatusMessage('Recognizing face in SSES database...');

    try {
      const API_URL = API_BASE_URL;

      const response = await fetch(`${API_URL}/face-auth/login-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ faceDescriptor: Array.from(descriptor) }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const secretKey = 'ITEG@123';
        const encryptedToken = CryptoJS.AES.encrypt(data.token, secretKey).toString();

        const userData = {
          ...data.user,
          department: ['superadmin', 'admin'].includes(data.user.role?.toLowerCase())
            ? 'SSISM'
            : data.user.department,
        };

        localStorage.setItem('token', encryptedToken);
        localStorage.setItem('role', userData.role);
        localStorage.setItem('positionRole', userData.positionRole || userData.position || 'admin');
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('userEmail', userData.email);
        localStorage.setItem('userName', userData.name);

        setStatus('success');
        setStatusMessage(`Welcome, ${userData.name}!`);
        toast.success(`🎉 Face ID Verified! Welcome back, ${userData.name}!`);

        cleanupCamera();

        setTimeout(() => {
          onLoginSuccess(userData);
        }, 1200);
      } else {
        cleanupCamera();
        setStatus('failed');

        if (data.message && data.message.includes('No registered faces')) {
          setStatusMessage('No Face IDs registered in the system.');
          toast.error('❌ No registered Face IDs found in SSES.');
          if (onNoFaceRegistered) {
            setTimeout(() => onNoFaceRegistered(), 1500);
          }
        } else if (data.message && data.message.includes('not recognized')) {
          setStatusMessage('Face not recognized with registered users.');
          toast.error('❌ Face not recognized. Please use standard email login or register your Face ID.');
        } else {
          setStatusMessage(data.message || 'Face authentication failed.');
          toast.error(data.message || '❌ Face authentication failed.');
        }
      }
    } catch (error) {
      console.error('Face auth API error:', error);
      cleanupCamera();
      setStatus('failed');
      setStatusMessage('Network error during face verification.');
      toast.error('❌ Connection error. Please check server connection.');
    }
  };

  // Begin Face Detection & Continuous Scan
  const startFaceScan = async () => {
    if (!modelsLoaded) {
      toast.warning('Please wait, AI models are still loading...');
      return;
    }

    try {
      setStatus('starting_camera');
      setStatusMessage('Initializing camera...');

      await startCameraStream();

      setStatus('scanning');
      setStatusMessage('Position your face inside the frame...');
      setScanSecondsLeft(15);
      isScanningActiveRef.current = true;

      // Countdown timer
      let timeLeft = 15;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        timeLeft -= 1;
        setScanSecondsLeft(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(timerIntervalRef.current);
          if (isScanningActiveRef.current) {
            cleanupCamera();
            setStatus('not_detected');
            setStatusMessage('No face detected within 15 seconds.');
            toast.info('No face detected. Please ensure good lighting and try again.');
          }
        }
      }, 1000);

      // Scanning loop (every 350ms)
      const detectionOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: 0.3,
      });

      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = setInterval(async () => {
        if (!isScanningActiveRef.current || !videoRef.current) return;

        try {
          if (
            videoRef.current.paused ||
            videoRef.current.ended ||
            videoRef.current.videoWidth === 0
          ) {
            return;
          }

          const detection = await faceapi
            .detectSingleFace(videoRef.current, detectionOptions)
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection && detection.descriptor && isScanningActiveRef.current) {
            console.log('✅ Face detected with score:', detection.detection.score.toFixed(3));
            await authenticateFace(detection.descriptor);
          }
        } catch (scanErr) {
          console.warn('Face scan frame check error:', scanErr);
        }
      }, 350);
    } catch (err) {
      console.error('Camera access error:', err);
      cleanupCamera();
      setStatus('failed');
      setStatusMessage('Camera access denied or unavailable.');
      toast.error('Could not access camera. Please allow webcam permissions in your browser.');
    }
  };

  const handleClose = () => {
    cleanupCamera();
    onClose();
  };

  return (
    <OrangeButton
      isOpen={true}
      onClose={handleClose}
      panelTitle="SSES Face ID Login"
      panelSubtitle="Fast, secure biometric authentication"
      showFooter={false}
      maxWidth="sm:max-w-md"
      drawerContent={
        <div className="flex flex-col items-center justify-between min-h-[420px] py-2 px-1">
          {/* Status Badge */}
          <div className="w-full flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-4 py-2.5 mb-4">
            <div className="flex items-center gap-2.5">
              {status === 'loading_models' && <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />}
              {status === 'ready' && <ScanFace className="w-5 h-5 text-orange-500" />}
              {status === 'starting_camera' && <Camera className="w-5 h-5 text-orange-500 animate-pulse" />}
              {status === 'scanning' && <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />}
              {status === 'authenticating' && <Sparkles className="w-5 h-5 text-orange-600 animate-spin" />}
              {status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
              {(status === 'failed' || status === 'not_detected') && <AlertCircle className="w-5 h-5 text-red-500" />}

              <span className="text-xs sm:text-sm font-semibold text-slate-800 tracking-tight">
                {statusMessage}
              </span>
            </div>

            {status === 'scanning' && (
              <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                {scanSecondsLeft}s
              </span>
            )}
          </div>

          {/* Camera Viewfinder & Preview */}
          <div className="relative w-full max-w-[320px] aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 border-2 border-orange-200 shadow-md flex items-center justify-center">
            {/* Always mounted video element ensures no DOM attachment race condition */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                ['scanning', 'authenticating'].includes(status) ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
              }`}
            />

            {/* Scanning Overlay Grid & Corner Brackets */}
            {['scanning', 'authenticating'].includes(status) && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Face Oval Guideline */}
                <div className="w-44 h-56 border-2 border-dashed border-orange-400/80 rounded-[48%] animate-pulse flex items-center justify-center shadow-[0_0_15px_rgba(253,169,45,0.4)]">
                  {status === 'authenticating' && (
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent animate-bounce" />
                  )}
                </div>

                {/* Corner Accents */}
                <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-orange-500" />
                <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-orange-500" />
                <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-orange-500" />
                <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-orange-500" />
              </div>
            )}

            {/* Placeholder state when not scanning */}
            {!['scanning', 'authenticating'].includes(status) && (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
                {status === 'loading_models' && (
                  <>
                    <Loader2 className="w-12 h-12 text-orange-400 animate-spin" />
                    <p className="text-xs text-slate-300">Initializing biometric engine...</p>
                  </>
                )}

                {status === 'ready' && (
                  <>
                    <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-400/30 flex items-center justify-center text-orange-400 shadow-inner">
                      <ScanFace className="w-9 h-9" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Center your face</p>
                      <p className="text-xs text-slate-400 mt-0.5">Ensure good lighting and look at camera</p>
                    </div>
                  </>
                )}

                {status === 'starting_camera' && (
                  <>
                    <Camera className="w-12 h-12 text-orange-400 animate-pulse" />
                    <p className="text-xs text-slate-300">Activating camera sensor...</p>
                  </>
                )}

                {status === 'success' && (
                  <>
                    <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400 animate-bounce">
                      <CheckCircle2 className="w-9 h-9" />
                    </div>
                    <p className="text-sm font-bold text-green-300">Authenticated!</p>
                  </>
                )}

                {(status === 'failed' || status === 'not_detected') && (
                  <>
                    <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                      <UserX className="w-9 h-9" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Recognition Unsuccessful</p>
                      <p className="text-xs text-slate-400 mt-0.5">Ensure your face is registered in SSES</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-2.5 mt-6">
            {status === 'ready' && (
              <button
                type="button"
                onClick={startFaceScan}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform active:scale-[0.98] cursor-pointer"
              >
                <ScanFace className="w-5 h-5" />
                <span>Start Face ID Scan</span>
              </button>
            )}

            {status === 'scanning' && (
              <button
                type="button"
                disabled
                className="w-full flex items-center justify-center gap-2 bg-orange-400/80 text-white font-semibold py-3 px-4 rounded-xl cursor-not-allowed shadow-inner"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Scanning... Please look at camera</span>
              </button>
            )}

            {status === 'authenticating' && (
              <button
                type="button"
                disabled
                className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white font-semibold py-3 px-4 rounded-xl cursor-not-allowed animate-pulse shadow-md"
              >
                <Sparkles className="w-5 h-5 animate-spin" />
                <span>Verifying Biometrics...</span>
              </button>
            )}

            {(status === 'failed' || status === 'not_detected') && (
              <button
                type="button"
                onClick={!modelsLoaded ? loadModels : startFaceScan}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform active:scale-[0.98] cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{!modelsLoaded ? 'Retry Loading AI Models' : 'Retry Face ID Scan'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2.5 border border-gray-200 text-gray-700 bg-white hover:bg-slate-50 hover:border-gray-400 font-bold tracking-wider uppercase text-xs sm:text-sm rounded-xl transition-all duration-200 active:scale-[0.97] shadow-2xs hover:shadow-xs cursor-pointer text-center"
            >
              Cancel & Use Password Login
            </button>
          </div>

          {/* Biometric Disclaimer */}
          <p className="text-[11px] text-slate-400 text-center mt-3 tracking-tight">
            Encrypted 128-bit vector matching. No facial images are stored on our servers.
          </p>
        </div>
      }
    />
  );
};

export default CompactFaceLogin;
