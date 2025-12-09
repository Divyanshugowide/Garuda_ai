
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CameraSource, CameraConfig, AnalysisResult, SecuritySeverity, FireSensitivity } from '../types';
import { analyzeFrame } from '../services/geminiService';
import { VideoCameraIcon, BoltIcon, FireIcon, UserIcon, CubeIcon, Cog6ToothIcon, EyeIcon, EyeSlashIcon, ComputerDesktopIcon, GlobeAltIcon } from '@heroicons/react/24/solid';

interface CameraFeedProps {
  camera: CameraSource;
  config: CameraConfig;
  onEventDetected: (sourceId: string, result: AnalysisResult) => void;
  onRemove: (id: string) => void;
  onUpdateConfig: (id: string, newConfig: Partial<CameraConfig>) => void;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ camera, config, onEventDetected, onRemove, onUpdateConfig }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Setup Video Source
  useEffect(() => {
    const setupStream = async () => {
      setError(null);
      if (camera.type === 'webcam') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        } catch (err) {
          setError("CAM OFFLINE: Access Denied");
        }
      } else if (camera.type === 'screen_capture' && camera.stream) {
         if (videoRef.current) {
            videoRef.current.srcObject = camera.stream;
            videoRef.current.play();
         }
      } else if (camera.type === 'video_file' && camera.fileSrc) {
        if (videoRef.current) {
          videoRef.current.src = camera.fileSrc;
          videoRef.current.loop = true;
          videoRef.current.muted = true;
          videoRef.current.play().catch(e => console.error("Autoplay prevented:", e));
        }
      } else if (camera.type === 'network_url' && camera.urlSrc) {
        if (videoRef.current) {
          // Attempt to use anonymous CORS for analysis
          videoRef.current.crossOrigin = "anonymous";
          videoRef.current.src = camera.urlSrc;
          videoRef.current.loop = true;
          videoRef.current.muted = true;
          videoRef.current.play().catch(err => {
             console.error("Stream load error:", err);
             setError("CONNECTION FAILED: Invalid URL or CORS Blocked");
          });
        }
      }
    };

    setupStream();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        if (camera.type === 'webcam') {
           const stream = videoRef.current.srcObject as MediaStream;
           stream.getTracks().forEach(track => track.stop());
        }
      }
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [camera]);

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !config.active || isProcessing) return;
    if (document.hidden) return;

    setIsProcessing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
        setIsProcessing(false);
        return;
      }

      // Draw exactly what is seen in the video element to the canvas
      canvas.width = 640; 
      canvas.height = (video.videoHeight / video.videoWidth) * 640;
      
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        
        const result = await analyzeFrame(base64Image, config.fireSensitivity);
        
        setLastAnalysis(result);
        if (result.detectedEvents.some(e => e.severity !== SecuritySeverity.SAFE)) {
          onEventDetected(camera.id, result);
        }
      } catch (drawErr) {
        console.error("Canvas Security Error", drawErr);
        setError("SECURITY BLOCK: Browser prevented AI analysis of this link (CORS).");
        onUpdateConfig(camera.id, { active: false });
      }

    } catch (err) {
      console.error("Frame capture error:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [config.active, config.fireSensitivity, isProcessing, onEventDetected, camera.id, onUpdateConfig]);

  // Interval Management
  useEffect(() => {
    if (config.active) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(captureAndAnalyze, config.intervalMs);
    } else {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [config.active, config.intervalMs, captureAndAnalyze]);

  // Styles based on severity
  const getBorderColor = () => {
    if (error) return 'border-red-900 shadow-none opacity-80';
    if (!config.active) return 'border-slate-800 opacity-70';
    if (!lastAnalysis) return 'border-cyan-900 shadow-[0_0_15px_rgba(6,182,212,0.1)]';
    const severities = lastAnalysis.detectedEvents.map(e => e.severity);
    if (severities.includes(SecuritySeverity.CRITICAL)) return 'border-red-600 shadow-[0_0_20px_#ef4444] animate-pulse';
    if (severities.includes(SecuritySeverity.HIGH)) return 'border-orange-500 shadow-[0_0_15px_#f97316]';
    if (severities.includes(SecuritySeverity.MEDIUM)) return 'border-yellow-400 shadow-[0_0_10px_#facc15]';
    if (severities.includes(SecuritySeverity.SAFE)) return 'border-cyan-500 shadow-[0_0_10px_#06b6d4]';
    return 'border-slate-700';
  };

  const getIcon = () => {
      if (camera.type === 'screen_capture') return <ComputerDesktopIcon className={`w-4 h-4 ${config.active ? 'text-purple-400' : 'text-slate-600'}`} />;
      if (camera.type === 'network_url') return <GlobeAltIcon className={`w-4 h-4 ${config.active ? 'text-blue-400' : 'text-slate-600'}`} />;
      return <VideoCameraIcon className={`w-4 h-4 ${config.active ? 'text-cyan-400' : 'text-slate-600'}`} />;
  };

  return (
    <div className={`relative bg-black rounded border-2 overflow-hidden transition-all duration-300 group ${getBorderColor()}`}>
      {/* Scanline Overlay */}
      <div className="scanline"></div>

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/90 to-transparent z-20 flex justify-between items-center font-mono">
        <div className="flex items-center gap-2">
           {getIcon()}
           <span className={`text-xs font-bold tracking-widest uppercase ${config.active ? 'text-cyan-400' : 'text-slate-600'}`}>
             {camera.name} {config.active ? '(LIVE)' : '(OFFLINE)'}
           </span>
        </div>
        <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSettings(!showSettings)} 
              className={`text-xs p-1 rounded hover:bg-cyan-900/50 ${showSettings ? 'text-cyan-300' : 'text-slate-500'}`}
            >
              <Cog6ToothIcon className="w-4 h-4" />
            </button>
            <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-green-400 animate-ping' : config.active ? 'bg-cyan-600' : 'bg-red-900'}`}></div>
            <button onClick={() => onRemove(camera.id)} className="text-slate-500 hover:text-red-500 font-bold px-1">
                &times;
            </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-10 right-2 z-30 bg-black/90 border border-cyan-500/30 p-3 rounded w-48 backdrop-blur-md">
           <h4 className="text-cyan-400 text-[10px] uppercase mb-2 font-bold border-b border-cyan-900 pb-1">Config Protocol</h4>
           <div className="mb-2">
             <label className="text-[10px] text-slate-400 block mb-1">Fire Sensitivity</label>
             <select 
               value={config.fireSensitivity} 
               onChange={(e) => onUpdateConfig(camera.id, { fireSensitivity: e.target.value as FireSensitivity })}
               className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-1 rounded focus:border-cyan-500 outline-none"
             >
               <option value="LOW">LOW</option>
               <option value="MEDIUM">MEDIUM</option>
               <option value="HIGH">HIGH</option>
               <option value="CRITICAL">CRITICAL</option>
             </select>
           </div>
           <div>
             <label className="text-[10px] text-slate-400 block mb-1">Scan Interval</label>
             <select 
               value={config.intervalMs} 
               onChange={(e) => onUpdateConfig(camera.id, { intervalMs: parseInt(e.target.value) })}
               className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-1 rounded focus:border-cyan-500 outline-none"
             >
               <option value="1000">1000ms (Max)</option>
               <option value="1500">1500ms (Fast)</option>
               <option value="3000">3000ms (Standard)</option>
               <option value="5000">5000ms (Eco)</option>
             </select>
           </div>
        </div>
      )}

      {/* Video Area */}
      <div className="relative aspect-video bg-[#050505] flex items-center justify-center overflow-hidden">
        {/* Offline Overlay */}
        {!config.active && !error && (
          <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center border border-dashed border-slate-800 m-4 rounded">
             <EyeSlashIcon className="w-12 h-12 text-slate-700 mb-2" />
             <p className="text-red-500 font-bold font-orbitron tracking-widest text-lg">NEURAL LINK OFFLINE</p>
             <p className="text-cyan-600 text-xs font-mono animate-pulse mt-1">INITIATE SYSTEM TO SCAN</p>
          </div>
        )}

        {/* Scanning Overlay */}
        {config.active && isProcessing && (
           <div className="absolute top-12 left-2 z-10 bg-black/50 px-2 py-1 rounded text-[10px] text-green-400 font-mono tracking-widest border border-green-900/50 animate-pulse">
              SCANNING...
           </div>
        )}

        {error ? (
          <div className="text-red-500 text-center p-4 font-mono w-full">
            <p className="font-bold tracking-widest text-xl mb-2">SIGNAL_LOST</p>
            <p className="text-xs opacity-70 border border-red-900/50 bg-red-950/20 p-2 rounded break-all">{error}</p>
          </div>
        ) : (
          <div className={`relative w-full h-full transition-opacity duration-500 ${!config.active ? 'opacity-30 grayscale' : 'opacity-100'}`}>
            <video 
              ref={videoRef} 
              className="w-full h-full object-contain" 
              playsInline 
              autoPlay 
              muted 
              loop 
            />
            
            {/* Bounding Boxes */}
            {config.active && lastAnalysis && lastAnalysis.detectedEvents.map((evt, idx) => {
              if (!evt.box_2d) return null;
              const [ymin, xmin, ymax, xmax] = evt.box_2d;
              
              const top = (ymin / 1000) * 100;
              const left = (xmin / 1000) * 100;
              const height = ((ymax - ymin) / 1000) * 100;
              const width = ((xmax - xmin) / 1000) * 100;

              const colorClass = 
                evt.severity === 'CRITICAL' ? 'border-red-500 shadow-[0_0_10px_#ef4444] bg-red-500/10' :
                evt.severity === 'HIGH' ? 'border-orange-500 shadow-[0_0_10px_#f97316] bg-orange-500/10' :
                'border-yellow-400 shadow-[0_0_5px_#facc15] bg-yellow-400/10';

              return (
                <div
                  key={idx}
                  className={`absolute border-2 z-10 ${colorClass}`}
                  style={{ top: `${top}%`, left: `${left}%`, width: `${width}%`, height: `${height}%` }}
                >
                  <span className="absolute -top-6 left-0 text-[10px] font-bold bg-black/80 px-1 text-white uppercase tracking-tighter shadow-sm">
                    {evt.category}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        
        {/* HUD Overlay */}
        {config.active && lastAnalysis && !error && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/80 border-t border-cyan-900/50 p-2 text-white font-mono z-20">
              <div className="flex flex-col gap-1">
                  {lastAnalysis.detectedEvents.length > 0 && lastAnalysis.detectedEvents[0].severity !== SecuritySeverity.SAFE ? (
                     lastAnalysis.detectedEvents.map((evt, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                             {evt.category.toLowerCase().includes('fire') && <FireIcon className="w-4 h-4 text-red-500 animate-pulse"/>}
                             {evt.category.toLowerCase().includes('drone') && <BoltIcon className="w-4 h-4 text-purple-400 animate-pulse"/>}
                             {evt.category.toLowerCase().includes('human') && <UserIcon className="w-4 h-4 text-yellow-500"/>}
                             <span className={`font-bold ${
                                 evt.severity === 'CRITICAL' ? 'text-red-500' : 
                                 evt.severity === 'HIGH' ? 'text-orange-500' : 'text-cyan-300'
                             }`}>[{evt.severity}]</span>
                             <span className="truncate">{evt.description.toUpperCase()}</span>
                        </div>
                     ))
                  ) : (
                      <div className="flex items-center gap-2 text-xs text-cyan-600">
                          <CubeIcon className="w-4 h-4" />
                          <span>NO THREATS DETECTED. SECTOR CLEAR.</span>
                      </div>
                  )}
              </div>
            </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraFeed;
