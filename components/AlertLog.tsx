import React from 'react';
import { DetectedEvent, SecuritySeverity } from '../types';
import { ExclamationTriangleIcon, ShieldCheckIcon, TrashIcon } from '@heroicons/react/24/outline';

interface AlertLogProps {
  events: (DetectedEvent & { sourceId: string })[];
  clearEvents: () => void;
}

const AlertLog: React.FC<AlertLogProps> = ({ events, clearEvents }) => {
  return (
    <div className="flex flex-col h-full bg-[#020202] border-l border-cyan-900/50 font-mono relative overflow-hidden">
      {/* Cyberpunk Grid Background with Overlay */}
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black pointer-events-none"></div>

      {/* Header */}
      <div className="p-4 border-b border-cyan-900/50 flex justify-between items-center bg-black/80 backdrop-blur-md sticky top-0 z-20 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <h2 className="text-sm font-bold text-cyan-400 flex items-center gap-2 tracking-[0.2em] uppercase font-orbitron drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 animate-pulse" />
          Threat Log
        </h2>
        <button 
          onClick={clearEvents}
          className="group flex items-center gap-1 text-[10px] text-slate-500 hover:text-red-400 uppercase tracking-wider transition-colors border border-transparent hover:border-red-900/50 px-2 py-1 rounded"
        >
          <TrashIcon className="w-3 h-3 group-hover:animate-bounce" />
          Purge
        </button>
      </div>

      {/* Log Feed */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-40 animate-pulse">
            <ShieldCheckIcon className="w-20 h-20 text-cyan-500 mb-4 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
            <p className="text-lg text-cyan-300 font-orbitron tracking-widest">SYSTEM SECURE</p>
            <p className="text-xs text-cyan-600 mt-2 font-mono">AWAITING INPUT STREAM...</p>
          </div>
        ) : (
          events.slice().reverse().map((evt, idx) => (
            <div 
              key={`${evt.timestamp}-${idx}`} 
              className={`p-4 rounded-sm border-l-4 relative overflow-hidden group transition-all duration-300 hover:translate-x-1 ${
                evt.severity === SecuritySeverity.CRITICAL ? 'border-red-500 bg-red-950/30 shadow-[0_0_30px_rgba(220,38,38,0.3)]' :
                evt.severity === SecuritySeverity.HIGH ? 'border-orange-500 bg-orange-950/20 shadow-[0_0_20px_rgba(249,115,22,0.2)]' :
                evt.severity === SecuritySeverity.MEDIUM ? 'border-yellow-500 bg-yellow-950/10' :
                'border-cyan-500 bg-cyan-950/10'
              }`}
            >
              {/* Scanline overlay for card */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none"></div>

              {/* Decorative corner */}
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-current opacity-50"></div>
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-current opacity-50"></div>

              <div className="flex justify-between items-start mb-2 relative z-10">
                <span className="text-[10px] text-slate-400 font-mono tracking-tighter">{evt.timestamp}</span>
                <span className={`text-[9px] uppercase font-bold px-2 py-0.5 border ${
                   evt.severity === SecuritySeverity.CRITICAL ? 'border-red-500 text-red-400 bg-red-900/40' :
                   evt.severity === SecuritySeverity.HIGH ? 'border-orange-500 text-orange-400 bg-orange-900/40' :
                   'border-cyan-800 text-cyan-400 bg-cyan-900/40'
                }`}>
                  {evt.sourceId}
                </span>
              </div>
              
              <h4 className={`text-xs font-bold uppercase tracking-widest mb-2 font-orbitron ${
                  evt.severity === SecuritySeverity.CRITICAL 
                    ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]' 
                    : evt.category.match(/fire|drone/i) ? 'text-white' : 'text-slate-200'
              }`}>
                  {evt.category} DETECTED
              </h4>
              
              <p className={`text-[11px] leading-relaxed font-mono ${
                 evt.severity === SecuritySeverity.CRITICAL ? 'text-red-200' : 'text-slate-400'
              }`}>
                {evt.description}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertLog;