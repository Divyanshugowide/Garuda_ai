
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CameraSource, CameraConfig, AnalysisResult, SecuritySeverity, DetectedEvent, FireSensitivity } from './types';
import CameraFeed from './components/CameraFeed';
import AlertLog from './components/AlertLog';
import SplashScreen from './components/SplashScreen';
import EagleLogo from './components/EagleLogo';
import { APP_NAME } from './constants';
import { PlusCircleIcon, PlayIcon, PauseIcon, CameraIcon, CpuChipIcon, SpeakerWaveIcon, SpeakerXMarkIcon, ComputerDesktopIcon, GlobeAltIcon, XMarkIcon } from '@heroicons/react/24/solid';

const App: React.FC = () => {
  // --- State ---
  const [showSplash, setShowSplash] = useState(true);
  const [cameras, setCameras] = useState<CameraSource[]>([
    { id: 'cam-01', name: 'SEC_CAM_01 (Live)', type: 'webcam' }
  ]);
  
  const [cameraConfigs, setCameraConfigs] = useState<Record<string, CameraConfig>>({
    'cam-01': { active: false, intervalMs: 1500, fireSensitivity: 'MEDIUM' }
  });

  const [systemActive, setSystemActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [events, setEvents] = useState<(DetectedEvent & { sourceId: string })[]>([]);
  const [latestAlert, setLatestAlert] = useState<string | null>(null);
  
  // URL Input State
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Audio System ---
  const playAlertTone = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const t = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sawtooth';
      
      osc.frequency.setValueAtTime(880, t); 
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.1); 
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.2); 
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.4); 

      gain.gain.setValueAtTime(0.1, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.start(t);
      osc.stop(t + 0.4);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  }, [soundEnabled]);

  const speakThreat = useCallback((text: string) => {
    if (!soundEnabled || !window.speechSynthesis) return;
    
    playAlertTone();

    if (window.speechSynthesis.speaking) return;

    setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05; 
        utterance.pitch = 0.85; 
        
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => 
            v.name.includes('Google US English') || 
            v.name.includes('Samantha') || 
            v.name.includes('Daniel')
        );
        if (preferredVoice) utterance.voice = preferredVoice;

        window.speechSynthesis.speak(utterance);
    }, 450);
  }, [soundEnabled, playAlertTone]);

  // --- Handlers ---

  const handleAddWebcam = () => {
    const newId = `cam-${Date.now().toString().slice(-4)}`;
    setCameras([...cameras, { id: newId, name: `SEC_CAM_${newId.split('-')[1]}`, type: 'webcam' }]);
    setCameraConfigs(prev => ({
        ...prev,
        [newId]: { active: systemActive, intervalMs: 1500, fireSensitivity: 'MEDIUM' }
    }));
  };

  const handleAddScreenShare = async () => {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const newId = `cctv-${Date.now().toString().slice(-4)}`;
        
        stream.getVideoTracks()[0].onended = () => {
            removeCamera(newId);
        };

        setCameras([...cameras, { 
            id: newId, 
            name: `CCTV_UPLINK_${newId.split('-')[1]}`, 
            type: 'screen_capture',
            stream: stream
        }]);
        setCameraConfigs(prev => ({
            ...prev,
            [newId]: { active: systemActive, intervalMs: 1500, fireSensitivity: 'MEDIUM' }
        }));
    } catch (err) {
        console.error("Failed to acquire screen share", err);
    }
  };

  const handleAddVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      const newId = `feed-${Date.now().toString().slice(-4)}`;
      setCameras([...cameras, { 
        id: newId, 
        name: `ARCHIVE_${newId.split('-')[1]}`, 
        type: 'video_file', 
        fileSrc: url 
      }]);
      setCameraConfigs(prev => ({
        ...prev,
        [newId]: { active: systemActive, intervalMs: 1500, fireSensitivity: 'MEDIUM' }
    }));
    }
  };

  const handleAddUrl = () => {
    if (!urlInputValue) return;
    const newId = `net-${Date.now().toString().slice(-4)}`;
    setCameras([...cameras, {
      id: newId,
      name: `NET_LINK_${newId.split('-')[1]}`,
      type: 'network_url',
      urlSrc: urlInputValue
    }]);
    setCameraConfigs(prev => ({
        ...prev,
        [newId]: { active: systemActive, intervalMs: 1500, fireSensitivity: 'MEDIUM' }
    }));
    setShowUrlInput(false);
    setUrlInputValue("");
  };

  const removeCamera = (id: string) => {
    setCameras(prev => {
        const cam = prev.find(c => c.id === id);
        if (cam && cam.type === 'screen_capture' && cam.stream) {
            cam.stream.getTracks().forEach(t => t.stop());
        }
        return prev.filter(c => c.id !== id);
    });
    setCameraConfigs(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
    });
  };

  const updateCameraConfig = (id: string, newConfig: Partial<CameraConfig>) => {
      setCameraConfigs(prev => ({
          ...prev,
          [id]: { ...prev[id], ...newConfig }
      }));
  };

  const handleEventDetected = useCallback((sourceId: string, result: AnalysisResult) => {
    const newEvents = result.detectedEvents
      .filter(e => e.severity !== SecuritySeverity.SAFE)
      .map(e => ({ ...e, sourceId }));

    if (newEvents.length > 0) {
      setEvents(prev => [...prev, ...newEvents]);
      
      const topEvent = newEvents[0];
      const alertMsg = `${topEvent.category.toUpperCase()} DETECTED ON ${sourceId}`;
      setLatestAlert(alertMsg);
      
      if (['HIGH', 'CRITICAL'].includes(topEvent.severity)) {
         const cam = cameras.find(c => c.id === sourceId);
         const camName = cam ? cam.name.replace(/\(Live\)|\(OFFLINE\)/g, '').trim() : sourceId;
         const spokenText = `Security Alert on ${camName}. ${topEvent.category} Detected. ${topEvent.description}`;
         speakThreat(spokenText);
      }

      setTimeout(() => setLatestAlert(null), 4000);

      if (Notification.permission === 'granted' && document.hidden) {
        new Notification(`GARUDA ALERT: ${topEvent.category}`, {
          body: topEvent.description
        });
      }
    }
  }, [cameras, speakThreat]);

  const clearEvents = () => {
    setEvents([]);
  };

  const toggleSystem = () => {
    const newState = !systemActive;
    setSystemActive(newState);
    
    setCameraConfigs(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
            next[key].active = newState;
        });
        return next;
    });

    if (newState) {
        speakThreat("Garuda System Engaged. Neural Link Established.");
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    } else {
        window.speechSynthesis.cancel();
    }
  };

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      
      {/* URL Input Modal */}
      {showUrlInput && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-[#050505] border border-cyan-500 rounded p-6 w-full max-w-md shadow-[0_0_50px_rgba(6,182,212,0.2)] relative">
              <button 
                onClick={() => setShowUrlInput(false)}
                className="absolute top-2 right-2 text-slate-500 hover:text-white"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
              <h3 className="text-cyan-400 font-orbitron font-bold tracking-widest text-lg mb-4 flex items-center gap-2">
                <GlobeAltIcon className="w-5 h-5" /> CONNECT BROWSER LINK
              </h3>
              <p className="text-xs text-slate-500 mb-4 font-mono">
                Enter Direct Video URL (MP4, WebM) or MJPEG Stream.<br/>
                <span className="text-red-900 bg-red-950/30 px-1 border border-red-900/50">NOTE: Server must support CORS for AI analysis.</span>
              </p>
              <input 
                type="text" 
                value={urlInputValue}
                onChange={(e) => setUrlInputValue(e.target.value)}
                placeholder="https://example.com/stream.mp4"
                className="w-full bg-slate-900 border border-slate-700 text-cyan-300 font-mono p-3 rounded focus:border-cyan-500 outline-none mb-4"
              />
              <div className="flex justify-end gap-3">
                 <button 
                   onClick={() => setShowUrlInput(false)}
                   className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white border border-transparent hover:border-slate-700 rounded"
                 >
                   CANCEL
                 </button>
                 <button 
                   onClick={handleAddUrl}
                   className="px-6 py-2 text-xs font-bold bg-cyan-900/30 text-cyan-400 border border-cyan-500 hover:bg-cyan-500 hover:text-black transition-all rounded shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                 >
                   CONNECT FEED
                 </button>
              </div>
           </div>
        </div>
      )}

      <div className={`flex h-screen bg-[#020202] text-white font-sans overflow-hidden transition-opacity duration-1000 ${showSplash ? 'opacity-0' : 'opacity-100'}`}>
        
        {latestAlert && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 text-white px-6 py-3 border border-red-500 rounded shadow-[0_0_30px_#ef4444] animate-bounce font-mono font-bold tracking-widest flex items-center gap-3">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
                SENDING ALERT TO MOBILE: {latestAlert}
            </div>
        )}

        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          
          <header className="h-16 border-b border-cyan-900/30 bg-[#050505]/90 flex items-center justify-between px-6 shrink-0 relative">
            <div className="flex items-center gap-4">
              <div className="relative group cursor-pointer">
                  <div className={`w-3 h-3 rounded-full absolute -top-1 -right-1 z-10 ${systemActive ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`} />
                  {systemActive && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75 z-10"></div>}
                  <EagleLogo className="w-10 h-10 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)] group-hover:scale-110 transition-transform" />
              </div>
              <h1 className="text-2xl font-bold tracking-[0.2em] font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
                {APP_NAME}
              </h1>
              <div className="hidden md:flex items-center gap-2 border-l border-cyan-900/50 pl-4 ml-4">
                 <CpuChipIcon className="w-4 h-4 text-cyan-600" />
                 <span className="text-[10px] text-cyan-700 font-mono">GEMINI 3 PRO NEURAL LINK ACTIVE</span>
              </div>
            </div>

            <div className="flex items-center gap-6 font-mono">
              <button 
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`flex items-center gap-2 px-3 py-1 rounded border transition-colors text-xs font-bold tracking-wider ${
                    soundEnabled 
                      ? 'border-cyan-500/50 text-cyan-400 bg-cyan-900/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                      : 'border-slate-700 text-slate-500 hover:text-slate-300 bg-slate-900/50'
                  }`}
              >
                  {soundEnabled ? <SpeakerWaveIcon className="w-4 h-4" /> : <SpeakerXMarkIcon className="w-4 h-4" />}
                  <span>VOICE: {soundEnabled ? 'ON' : 'OFF'}</span>
              </button>

              <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">SYSTEM STATUS:</span>
                  <span className={`text-sm font-bold tracking-wider ${systemActive ? 'text-green-400' : 'text-red-500'}`}>
                      {systemActive ? 'ONLINE' : 'STANDBY'}
                  </span>
              </div>

              <button
                onClick={toggleSystem}
                className={`flex items-center gap-2 px-6 py-2 rounded-sm font-bold transition-all border ${
                  systemActive 
                  ? 'bg-red-900/20 text-red-500 border-red-500/50 hover:bg-red-500 hover:text-white shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
                  : 'bg-cyan-900/20 text-cyan-400 border-cyan-500/50 hover:bg-cyan-500 hover:text-black shadow-[0_0_10px_rgba(6,182,212,0.2)] animate-pulse'
                }`}
              >
                {systemActive ? <><PauseIcon className="w-4 h-4" /> DISENGAGE</> : <><PlayIcon className="w-4 h-4" /> ENGAGE</>}
              </button>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-y-auto">
            {cameras.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-700 font-mono">
                 <EagleLogo className="w-24 h-24 opacity-10 mb-4" />
                 <p className="tracking-widest">NO SIGNAL DETECTED</p>
                 <p className="text-xs mt-2">INITIALIZE CAMERA FEED TO BEGIN</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {cameras.map((cam) => (
                  <CameraFeed
                    key={cam.id}
                    camera={cam}
                    config={cameraConfigs[cam.id]}
                    onEventDetected={handleEventDetected}
                    onRemove={removeCamera}
                    onUpdateConfig={updateCameraConfig}
                  />
                ))}
                
                <div className="aspect-video bg-[#050505] border border-dashed border-cyan-900/50 rounded flex flex-col items-center justify-center gap-4 hover:border-cyan-500/50 hover:bg-cyan-900/5 transition-all group font-mono">
                    <span className="text-cyan-800 text-xs font-bold tracking-widest group-hover:text-cyan-400 transition-colors">ESTABLISH NEW FEED</span>
                    <div className="flex flex-wrap justify-center gap-2 px-4">
                      <button 
                          onClick={handleAddWebcam}
                          className="px-4 py-2 bg-slate-900 border border-slate-700 hover:border-cyan-500 hover:text-cyan-400 text-slate-400 rounded-sm text-xs transition-colors flex items-center gap-2"
                      >
                          <CameraIcon className="w-3 h-3" /> LIVE WEB CAM
                      </button>
                      <button 
                          onClick={handleAddScreenShare}
                          className="px-4 py-2 bg-slate-900 border border-slate-700 hover:border-purple-500 hover:text-purple-400 text-slate-400 rounded-sm text-xs transition-colors flex items-center gap-2"
                          title="Link an external CCTV viewer window"
                      >
                          <ComputerDesktopIcon className="w-3 h-3" /> LINK CCTV / WINDOW
                      </button>
                       <button 
                          onClick={() => setShowUrlInput(true)}
                          className="px-4 py-2 bg-slate-900 border border-slate-700 hover:border-blue-500 hover:text-blue-400 text-slate-400 rounded-sm text-xs transition-colors flex items-center gap-2"
                          title="Connect to IP Camera or Video URL"
                      >
                          <GlobeAltIcon className="w-3 h-3" /> BROWSER LINK
                      </button>
                      <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-slate-900 border border-slate-700 hover:border-cyan-500 hover:text-cyan-400 text-slate-400 rounded-sm text-xs transition-colors flex items-center gap-2"
                      >
                          <PlusCircleIcon className="w-3 h-3" /> IMPORT FILE
                      </button>
                      <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="video/*" 
                          onChange={handleAddVideoFile} 
                      />
                    </div>
                </div>
              </div>
            )}
          </main>
        </div>

        <aside className="w-96 h-full shrink-0 z-20 shadow-[-5px_0_20px_rgba(0,0,0,0.5)]">
          <AlertLog events={events} clearEvents={clearEvents} />
        </aside>

      </div>
    </>
  );
};

export default App;
