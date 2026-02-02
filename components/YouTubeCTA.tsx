import React, { useState } from 'react';
import { CHANNEL_URL, CHANNEL_NAME, ICONS } from '../constants';

export const YouTubeCTA: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-red-600 text-white p-4 shadow-2xl z-50 border-t-4 border-red-800 animate-slide-up">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 relative pr-8 sm:pr-0">
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute -top-2 right-0 sm:relative sm:top-0 sm:order-3 text-red-200 hover:text-white p-1 rounded-full hover:bg-red-700 transition-colors"
          aria-label="Cerrar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        <div className="flex items-center gap-3">
          <div className="bg-white text-red-600 p-2 rounded-full" dangerouslySetInnerHTML={{__html: ICONS.YOUTUBE}} />
          <div className="text-center sm:text-left">
            <p className="font-bold text-lg">¡Apoya al canal suscribiéndote!</p>
            <p className="text-sm text-red-100">Aprende más en {CHANNEL_NAME}</p>
          </div>
        </div>
        
        <a 
          href={CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white text-red-600 hover:bg-red-50 px-6 py-2 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
        >
          <span>Suscribirse Ahora</span>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 15l5-3-5-3v6z"/></svg>
        </a>
      </div>
    </div>
  );
};