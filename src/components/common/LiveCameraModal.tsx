import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';

interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64: string, filename: string) => void;
  title?: string;
}

export const LiveCameraModal: React.FC<LiveCameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'التقاط صورة بالكاميرا مباشرة',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [snappedPhoto, setSnappedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);

  // Stop camera stream helper
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Start live camera stream
  const startCamera = async (mode: 'environment' | 'user') => {
    stopStream();
    setIsLoading(true);
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('المتصفح لا يدعم الوصول المباشر للكاميرا. يرجى استخدام متصفح حديث أو اختيار صورة من الملفات.');
      }

      // Check available video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setHasMultipleCameras(videoDevices.length > 1);

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      console.warn('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('تم رفض إذن الوصول للكاميرا. يرجى السماح للمتصفح بالوصول للكاميرا من إعدادات الموقع.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('لم يتم العثور على كاميرا متصلة بالجهاز.');
      } else {
        setCameraError(err.message || 'تعذر تشغيل الكاميرا مباشرة.');
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSnappedPhoto(null);
      startCamera(facingMode);
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen, facingMode]);

  // Flip camera (Rear vs Front)
  const toggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Snap photo from video feed
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If front camera, mirror the image back
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.88);
    setSnappedPhoto(base64);
  };

  // Confirm photo
  const handleConfirm = () => {
    if (!snappedPhoto) return;
    const filename = `camera_snap_${Date.now()}.jpg`;
    onCapture(snappedPhoto, filename);
    onClose();
  };

  // Handle native file fallback
  const handleFallbackFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      onCapture(base64, file.name);
      onClose();
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="relative max-w-2xl w-full bg-slate-950 rounded-2xl border-2 border-cyan-500/60 p-4 sm:p-5 shadow-2xl space-y-4 flex flex-col max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-slate-100">
            <span className="text-xl">📸</span>
            <h3 className="text-base sm:text-lg font-black text-cyan-200">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Viewfinder / Snapped Preview */}
        <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
          {snappedPhoto ? (
            /* Photo Review Screen */
            <div className="relative w-full h-full flex flex-col items-center">
              <img
                src={snappedPhoto}
                alt="الصورة الملتقطة"
                className="max-h-[60vh] w-full object-contain rounded-xl"
              />
              <div className="absolute top-3 right-3 bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 px-3 py-1 rounded-full text-xs font-black shadow-lg">
                ✓ تم التقاط الصورة
              </div>
            </div>
          ) : cameraError ? (
            /* Camera Error / Fallback UI */
            <div className="p-6 text-center space-y-4 max-w-md">
              <span className="text-4xl block">📷⚠️</span>
              <p className="text-sm font-bold text-rose-300">{cameraError}</p>
              <div className="space-y-2 pt-2">
                <label className="inline-flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black px-4 py-2.5 rounded-xl cursor-pointer shadow-lg w-full">
                  <span>📁</span> اختيار صورة من المعرض أو المستندات
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFallbackFile(file);
                    }}
                  />
                </label>
                <Button variant="secondary" onClick={() => startCamera(facingMode)} className="w-full text-xs font-bold">
                  🔄 إعادة محاولة فتح الكاميرا
                </Button>
              </div>
            </div>
          ) : (
            /* Live Camera Stream */
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-10 text-cyan-300 space-y-2">
                  <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold">جاري فتح الكاميرا...</span>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`max-h-[60vh] w-full object-contain rounded-xl ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Viewfinder Target Guide */}
              <div className="absolute inset-8 border-2 border-dashed border-cyan-400/40 rounded-2xl pointer-events-none flex items-center justify-center">
                <span className="text-xs font-bold text-cyan-200/60 bg-black/40 px-3 py-1 rounded-full">
                  وجّه الكاميرا نحو بون الميزان أو البضاعة
                </span>
              </div>

              {/* Switch Camera Button (if multiple cameras exist) */}
              {hasMultipleCameras && (
                <button
                  type="button"
                  onClick={toggleCamera}
                  className="absolute top-3 left-3 bg-slate-900/80 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg cursor-pointer transition-all"
                >
                  <span>🔄</span> تبديل الكاميرا
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          {snappedPhoto ? (
            /* Review Actions */
            <div className="flex items-center justify-between w-full gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setSnappedPhoto(null)}
                className="font-bold flex items-center gap-1.5 text-xs sm:text-sm"
              >
                <span>🔄</span> إعادة الالتقاط
              </Button>
              <Button
                variant="success"
                size="md"
                onClick={handleConfirm}
                className="font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-6 flex items-center gap-2 text-xs sm:text-sm shadow-xl"
              >
                <span>✓</span> اعتماد واستخدام هذه الصورة
              </Button>
            </div>
          ) : (
            /* Live Capture Actions */
            <div className="flex items-center justify-between w-full gap-3">
              <label className="text-xs font-bold text-slate-400 hover:text-cyan-300 cursor-pointer flex items-center gap-1.5">
                <span>📁</span> اختيار من المعرض بدلاً من الكاميرا
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFallbackFile(file);
                  }}
                />
              </label>

              <button
                type="button"
                disabled={isLoading || Boolean(cameraError)}
                onClick={takeSnapshot}
                className="font-black text-sm sm:text-base bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 px-8 py-3 rounded-2xl shadow-xl flex items-center gap-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-xl">📸</span>
                <span>التقاط الصورة الآن</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
