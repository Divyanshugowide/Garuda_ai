
import React, { useEffect, useState } from 'react';
import EagleLogo from './EagleLogo';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [opacity, setOpacity] = useState(1);
  const [text, setText] = useState("");
  const [started, setStarted] = useState(false);
  
  const fullText = "GARUDA AI SYSTEM INITIALIZED";

  const playSequence = async () => {
    setStarted(true);
    
    // 1. Text Animation
    let i = 0;
    const interval = setInterval(() => {
      setText(fullText.slice(0, i + 1));
      i++;
      if (i > fullText.length) clearInterval(interval);
    }, 50);

    // 2. Audio Generation (Cinematic Bass Only - NO SCREECH)
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      const t = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      masterGain.gain.value = 0.5;

      // -- Sound: Deep Bass Swell --
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.connect(bassGain);
      bassGain.connect(masterGain);
      
      bass.type = 'sine';
      bass.frequency.setValueAtTime(60, t);
      bass.frequency.exponentialRampToValueAtTime(30, t + 2.5);
      
      bassGain.gain.setValueAtTime(0, t);
      bassGain.gain.linearRampToValueAtTime(1.0, t + 0.1);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + 3.0);
      
      bass.start(t);
      bass.stop(t + 3.5);

      // -- Voice Synthesis --
      const speak = () => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance("Welcome to Garuda A.I.");
        utterance.rate = 0.9;
        utterance.pitch = 0.9;
        utterance.volume = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha') || v.lang === 'en-US');
        if (preferred) utterance.voice = preferred;

        window.speechSynthesis.speak(utterance);
      };

      setTimeout(() => {
        if (window.speechSynthesis.getVoices().length === 0) {
           window.speechSynthesis.onvoiceschanged = speak;
           setTimeout(speak, 500);
        } else {
           speak();
        }
      }, 500);

    } catch (e) {
      console.error("Audio init failed", e);
    }

    // 3. Transition to App
    const timer = setTimeout(() => {
      setOpacity(0);
      setTimeout(onComplete, 1000);
    }, 4500);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center transition-opacity duration-1000 overflow-hidden"
      style={{ opacity, pointerEvents: opacity === 0 ? 'none' : 'auto' }}
    >
      {!started ? (
        <div className="flex-1 flex items-center justify-center w-full">
          <button 
            onClick={playSequence}
            className="group relative px-10 py-5 bg-black border-2 border-cyan-500 text-cyan-400 font-orbitron font-bold tracking-widest text-xl md:text-2xl uppercase hover:bg-cyan-900/30 transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] animate-pulse rounded-sm"
          >
            <span className="relative z-10 flex items-center gap-3">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-ping"></span>
              Initialize System
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-ping"></span>
            </span>
            <div className="absolute inset-0 bg-cyan-500/10 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-bottom"></div>
          </button>
        </div>
      ) : (
        <>
          {/* Main Content Centered */}
          <div className="flex-1 flex flex-col items-center justify-center w-full p-4">
            <div className="relative mb-6 transition-all duration-1000 animate-in fade-in zoom-in-75 flex-shrink-0">
              {/* Eagle Logo Container */}
              <div className="w-64 h-48 md:w-[500px] md:h-[350px]">
                <EagleLogo className="w-full h-full rounded-2xl border-2 border-cyan-500/50 shadow-[0_0_60px_rgba(6,182,212,0.5)]" />
              </div>
              <div className="absolute inset-0 bg-cyan-400/10 blur-[80px] rounded-full -z-10 animate-pulse"></div>
            </div>
            
            <h1 className="text-4xl md:text-7xl font-orbitron font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-500 to-cyan-300 tracking-[0.15em] mb-4 md:mb-8 drop-shadow-[0_0_20px_rgba(6,182,212,0.6)] text-center animate-pulse flex-shrink-0">
              GARUDA AI
            </h1>
            
            <div className="h-8 flex-shrink-0">
              <p className="text-cyan-500 font-mono text-sm md:text-xl tracking-[0.3em] md:tracking-[0.5em] font-bold border-r-4 border-cyan-500 pr-2 whitespace-nowrap">
                {text}
              </p>
            </div>
          </div>
          
          {/* Footer at bottom (part of flex flow, no overlaps) */}
          <div className="mb-12 shrink-0 text-[10px] md:text-xs text-slate-500 font-mono tracking-[0.3em] uppercase text-center">
             Secure Neural Link • v3.0 • Access Granted
          </div>
        </>
      )}
    </div>
  );
};

export default SplashScreen;
