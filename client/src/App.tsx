import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { KeyboardControls } from "@react-three/drei";
import { useAudio } from "./lib/stores/useAudio";
import { Game } from "./components/Game";
import { TypingInterface } from "./components/TypingInterface";
import { GameHUD } from "./components/GameHUD";
import { useZombieGame } from "./lib/stores/useZombieGame";
import "@fontsource/inter";

// Main App component
function App() {
  const [showCanvas, setShowCanvas] = useState(false);
  const { setHitSound, setSuccessSound } = useAudio();
  const { gameState, restartGame } = useZombieGame();

  // Load audio assets
  useEffect(() => {
    const loadAudio = async () => {
      try {
        const hitAudio = new Audio('/sounds/hit.mp3');
        const successAudio = new Audio('/sounds/success.mp3');
        
        // Preload audio
        await Promise.all([
          new Promise(resolve => {
            hitAudio.addEventListener('canplaythrough', resolve, { once: true });
            hitAudio.load();
          }),
          new Promise(resolve => {
            successAudio.addEventListener('canplaythrough', resolve, { once: true });
            successAudio.load();
          })
        ]);

        setHitSound(hitAudio);
        setSuccessSound(successAudio);
      } catch (error) {
        console.warn('Audio loading failed:', error);
      }
    };

    loadAudio();
    setShowCanvas(true);
  }, [setHitSound, setSuccessSound]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {showCanvas && (
        <KeyboardControls map={[]}>
          <Canvas
            shadows
            camera={{
              position: [0, 5, 10],
              fov: 60,
              near: 0.1,
              far: 1000
            }}
            gl={{
              antialias: true,
              powerPreference: "default"
            }}
          >
            <color attach="background" args={["#0a0a0a"]} />
            
            {/* Lighting */}
            <ambientLight intensity={0.3} />
            <directionalLight
              position={[10, 10, 5]}
              intensity={1}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
            />
            
            <Suspense fallback={null}>
              <Game />
            </Suspense>
          </Canvas>
        </KeyboardControls>
      )}
      
      {/* UI Overlay - Outside Canvas */}
      <TypingInterface />
      <GameHUD />
      
      {/* Game Over Screen */}
      {gameState === 'gameOver' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
            zIndex: 1000
          }}
        >
          <h2>Game Over!</h2>
          <button
            onClick={restartGame}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              fontSize: '18px',
              backgroundColor: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Play Again
          </button>
        </div>
      )}
      
      {/* Victory Screen */}
      {gameState === 'victory' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 50, 0, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '28px',
            zIndex: 1000
          }}
        >
          <h2>🏆 VICTORY! 🏆</h2>
          <p style={{ fontSize: '18px', marginTop: '10px' }}>Perfect streak! You got the nuke!</p>
          <button
            onClick={restartGame}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              fontSize: '18px',
              backgroundColor: '#44ff44',
              color: 'black',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
