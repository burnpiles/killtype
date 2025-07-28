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
      
      {/* Word display */}
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: '20px 40px',
          borderRadius: '10px',
          border: missedShot ? '3px solid #ff4444' : '3px solid #333',
          fontSize: '32px',
          fontFamily: 'monospace',
          color: 'white',
          minWidth: '300px',
          transition: 'border-color 0.1s'
        }}
      >
        {currentWord.split('').map((char, index) => (
          <span
            key={index}
            style={{
              color: index < currentIndex ? '#44ff44' : 
                     index === currentIndex ? '#ffff44' : 'white',
              backgroundColor: index === currentIndex ? 'rgba(255, 255, 68, 0.2)' : 'transparent',
              padding: '2px'
            }}
          >
            {char}
          </span>
        ))}
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
