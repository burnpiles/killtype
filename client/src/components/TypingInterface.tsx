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
      
      {/* Enhanced word display with targeting feedback */}
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          padding: '25px 50px',
          borderRadius: '15px',
          border: missedShot ? '4px solid #ff0000' : '4px solid #00ff00',
          fontSize: '36px',
          fontFamily: 'monospace',
          color: 'white',
          minWidth: '400px',
          transition: 'all 0.1s',
          boxShadow: missedShot ? '0 0 20px #ff0000' : '0 0 20px #00ff00',
          animation: missedShot ? 'shake 0.3s' : 'none'
        }}
      >
        <div style={{ 
          fontSize: '14px', 
          color: '#00ff00', 
          marginBottom: '10px',
          textAlign: 'center'
        }}>
          🎯 TARGET LOCKED
        </div>
        
        {currentWord.split('').map((char, index) => (
          <span
            key={index}
            style={{
              color: index < currentIndex ? '#00ff00' : 
                     index === currentIndex ? '#ffff00' : '#cccccc',
              backgroundColor: index === currentIndex ? 'rgba(255, 255, 0, 0.3)' : 'transparent',
              padding: '4px',
              fontWeight: index === currentIndex ? 'bold' : 'normal',
              fontSize: index === currentIndex ? '40px' : '36px',
              textShadow: index < currentIndex ? '0 0 8px #00ff00' : 
                          index === currentIndex ? '0 0 8px #ffff00' : 'none',
              transition: 'all 0.1s'
            }}
          >
            {char}
          </span>
        ))}
        
        <div style={{
          marginTop: '10px',
          fontSize: '16px',
          color: '#ffff00',
          textAlign: 'center'
        }}>
          Progress: {currentIndex}/{currentWord.length} | {Math.round((currentIndex/currentWord.length)*100)}%
        </div>
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
