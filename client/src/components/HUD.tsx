import { useZombieGame } from "../lib/stores/useZombieGame";

export function HUD() {
  const { 
    lives, 
    score, 
    wpm, 
    accuracy, 
    currentWeapon,
    zombies,
    gameState 
  } = useZombieGame();

  if (gameState !== 'playing') return null;

  return (
    <>
      {/* Top-left HUD like in The Typing of the Dead */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        fontSize: '20px',
        fontFamily: 'monospace',
        color: 'white',
        textShadow: '2px 2px 4px black'
      }}>
        {/* Player silhouette icon */}
        <div style={{
          width: '60px',
          height: '80px',
          background: 'linear-gradient(45deg, #ff4444, #cc2222)',
          clipPath: 'polygon(30% 0%, 70% 0%, 85% 20%, 85% 40%, 75% 50%, 85% 60%, 85% 80%, 70% 100%, 30% 100%, 15% 80%, 15% 60%, 25% 50%, 15% 40%, 15% 20%)',
          position: 'relative'
        }}>
          {/* Weapon in silhouette */}
          <div style={{
            position: 'absolute',
            right: '-15px',
            top: '30px',
            width: '25px',
            height: '6px',
            backgroundColor: '#444',
            borderRadius: '3px'
          }} />
        </div>

        {/* Lives display with health bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{
              width: '40px',
              height: '8px',
              backgroundColor: i < lives ? '#00ff00' : '#333333',
              border: '1px solid #666666',
              boxShadow: i < lives ? '0 0 8px #00ff00' : 'none'
            }} />
          ))}
        </div>

        {/* Score display */}
        <div style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#ffffff',
          textShadow: '0 0 10px #ffffff'
        }}>
          {score.toLocaleString()}
        </div>

        {/* Weapon ammo indicator (film reel style) */}
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          border: '4px solid #666666',
          position: 'relative',
          backgroundColor: '#333333'
        }}>
          {/* Film reel holes */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#666666',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) rotate(${i * 60}deg) translateY(-15px)`
            }} />
          ))}
          
          {/* Center hub */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: '#888888'
          }} />
        </div>
      </div>

      {/* Bottom stats bar */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        gap: '40px',
        fontSize: '18px',
        fontFamily: 'monospace',
        color: 'white',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '15px 30px',
        borderRadius: '10px',
        border: '2px solid #444444'
      }}>
        <div>
          <div style={{ color: '#ffff00', marginBottom: '5px' }}>WPM</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{Math.round(wpm)}</div>
        </div>
        
        <div>
          <div style={{ color: '#00ff00', marginBottom: '5px' }}>ACCURACY</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{Math.round(accuracy)}%</div>
        </div>
        
        <div>
          <div style={{ color: '#ff6666', marginBottom: '5px' }}>WEAPON</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase' }}>
            {currentWeapon}
          </div>
        </div>
        
        <div>
          <div style={{ color: '#66ffff', marginBottom: '5px' }}>TARGETS</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{zombies.length}</div>
        </div>
      </div>

      {/* Emergency lighting effect overlay */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 20%, rgba(255, 0, 0, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 0, 0, 0.1) 0%, transparent 50%)',
        pointerEvents: 'none',
        zIndex: 999,
        animation: 'pulse 3s ease-in-out infinite alternate'
      }} />
    </>
  );
}