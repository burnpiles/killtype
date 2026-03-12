import React, { useEffect, useRef } from "react";
import { useZombieGame } from "../lib/stores/useZombieGame";

export function TypingInterface() {
  const {
    currentWord,
    currentIndex,
    missedShot,
    processKeyPress,
    gameState
  } = useZombieGame();
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (gameState === 'playing') {
        // Prevent default behavior for game keys
        if (event.key.length === 1 || event.key === 'Backspace') {
          event.preventDefault();
          
          // Store current index before processing
          const prevIndex = currentIndex;
          
          processKeyPress(event.key);
          
          // Trigger weapon effects if correct character was typed
          setTimeout(() => {
            if (currentIndex > prevIndex) {
              // Correct character typed - fire weapon
              if ((window as any).triggerWeaponFire) {
                (window as any).triggerWeaponFire();
              }
            }
          }, 50);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [processKeyPress, gameState, currentIndex]);

  // Auto-focus to capture typing
  useEffect(() => {
    if (inputRef.current && gameState === 'playing') {
      inputRef.current.focus();
    }
  }, [gameState]);

  if (gameState !== 'playing') return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {/* Hidden input to capture focus */}
      <input
        ref={inputRef}
        style={{
          position: 'absolute',
          left: '-9999px',
          opacity: 0
        }}
        autoFocus
      />
      
      {/* Bottom typing area */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-none">
        {currentWord && (
          <div className="bg-black/90 border-2 border-green-400 rounded-lg p-4 mb-4">
            <div className="text-center mb-2">
              <span className="text-green-400 text-sm font-mono">TARGET WORD</span>
            </div>
            <div className="flex justify-center space-x-1">
              {currentWord.split('').map((char, index) => (
                <span
                  key={index}
                  className={`
                    text-2xl font-mono font-bold px-1 py-1 min-w-[2rem] text-center
                    ${index < currentIndex 
                      ? 'text-green-400 line-through' 
                      : index === currentIndex 
                        ? 'text-yellow-400 bg-yellow-400/20 animate-pulse' 
                        : 'text-white'
                    }
                  `}
                >
                  {char}
                </span>
              ))}
            </div>
            <div className="text-center mt-2">
              <span className="text-gray-400 text-xs">
                Progress: {currentIndex}/{currentWord.length}
              </span>
            </div>
          </div>
        )}
        
        <div className="text-center">
          <span className="text-white text-lg font-mono bg-black/80 px-4 py-2 rounded border border-green-400">
            Type the word to shoot the zombie!
          </span>
        </div>
      </div>

      {/* Center crosshair */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        {/* Crosshair */}
        <div className={`
          absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
          w-0.5 h-5 ${missedShot ? 'bg-red-500' : 'bg-green-500'}
          ${missedShot ? 'shadow-red-500' : 'shadow-green-500'} shadow-lg
        `} />
        <div className={`
          absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
          w-5 h-0.5 ${missedShot ? 'bg-red-500' : 'bg-green-500'}
          ${missedShot ? 'shadow-red-500' : 'shadow-green-500'} shadow-lg
        `} />
        
        {/* Targeting circle */}
        <div className={`
          absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
          w-16 h-16 border-2 rounded-full opacity-50
          ${missedShot ? 'border-red-500 animate-pulse' : 'border-green-500'}
        `} />
      </div>
    </div>
  );
}
