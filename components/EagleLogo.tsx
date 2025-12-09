
import React from 'react';

interface EagleLogoProps {
  className?: string;
}

const EagleLogo: React.FC<EagleLogoProps> = ({ className = "w-10 h-10" }) => {
  return (
    <div className={`${className} relative overflow-hidden rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.3)] group border border-cyan-500/50 bg-slate-900`}>
      {/* Correct direct URL for the requested black & white eagle image */}
      <img 
        src="https://images.unsplash.com/photo-1611689342806-0863700ce1e4?q=80&w=1935&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D://unsplash.com/photos/black-and-white-eagle-flyinghttps://images.unsplash.com/photo-1611689342806-0863700ce1e4?q=80&w=1935&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D-ID48ekBTlDo" 
        alt="Garuda AI Eagle"
        className="w-full h-full object-cover opacity-100 transition-transform duration-[3s] ease-in-out group-hover:scale-110"
      />
      
      {/* Subtle Blue Tint (No mix-blend-overlay to prevent invisibility) */}
      <div className="absolute inset-0 bg-cyan-500/10 pointer-events-none"></div>
      
      {/* Animated Scanline Effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent z-10 h-[20%] w-full animate-[scan_3s_linear_infinite] pointer-events-none opacity-50"></div>
      
      {/* Grid Texture */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.2)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-20 bg-[length:100%_3px,3px_100%] pointer-events-none opacity-30"></div>
      
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(500%); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default EagleLogo;
