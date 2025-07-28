import { useEffect, useRef } from "react";
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
          processKeyPress(event.key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [processKeyPress, gameState]);

  // Auto-focus to capture typing
  useEffect(() => {
    if (inputRef.current && gameState === 'playing') {
      inputRef.current.focus();
    }
  }, [gameState]);

  if (gameState !== 'playing') return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        textAlign: 'center'
      }}
    >
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
      
      {/* Crosshair and targeting indicator */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '40px',
        height: '40px',
        pointerEvents: 'none'
      }}>
        {/* Crosshair */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '2px',
          height: '20px',
          backgroundColor: missedShot ? '#ff0000' : '#00ff00',
          boxShadow: `0 0 10px ${missedShot ? '#ff0000' : '#00ff00'}`
        }} />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '20px',
          height: '2px',
          backgroundColor: missedShot ? '#ff0000' : '#00ff00',
          boxShadow: `0 0 10px ${missedShot ? '#ff0000' : '#00ff00'}`
        }} />
        
        {/* Targeting circle */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60px',
          height: '60px',
          border: `2px solid ${missedShot ? '#ff0000' : '#00ff00'}`,
          borderRadius: '50%',
          opacity: 0.5,
          animation: missedShot ? 'pulse-red 0.3s' : 'none'
        }} />
      </div>
      
      {/* Typing instructions */}
      <div
        style={{
          marginTop: '20px',
          color: 'white',
          fontSize: '16px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
        }}
      >
        Type the word to shoot the zombie!
      </div>
    </div>
  );
}
