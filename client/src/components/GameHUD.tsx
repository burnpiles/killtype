import { useZombieGame } from "../lib/stores/useZombieGame";

export function GameHUD() {
  const {
    lives,
    score,
    wpm,
    accuracy,
    currentWeapon,
    streak,
    gameState
  } = useZombieGame();

  if (gameState !== 'playing') return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '20px',
        zIndex: 100,
        display: 'flex',
        justifyContent: 'space-between',
        color: 'white',
        fontSize: '18px',
        fontFamily: 'monospace',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
      }}
    >
      {/* Left side stats */}
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '15px',
          borderRadius: '10px',
          minWidth: '200px'
        }}
      >
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: '#ff4444' }}>Lives: </span>
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} style={{ color: i < lives ? '#ff4444' : '#333' }}>❤</span>
          ))}
        </div>
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: '#44ff44' }}>Score: </span>
          {score}
        </div>
        <div>
          <span style={{ color: '#4444ff' }}>Streak: </span>
          {streak}
        </div>
      </div>

      {/* Center weapon display */}
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '15px',
          borderRadius: '10px',
          textAlign: 'center'
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '5px' }}>
          {getWeaponIcon(currentWeapon)}
        </div>
        <div style={{ color: '#ffff44' }}>
          {currentWeapon.toUpperCase()}
        </div>
      </div>

      {/* Right side stats */}
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '15px',
          borderRadius: '10px',
          minWidth: '200px',
          textAlign: 'right'
        }}
      >
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: '#ffff44' }}>WPM: </span>
          {Math.round(wpm)}
        </div>
        <div>
          <span style={{ color: '#ff44ff' }}>Accuracy: </span>
          {Math.round(accuracy)}%
        </div>
      </div>
    </div>
  );
}

function getWeaponIcon(weapon: string): string {
  switch (weapon) {
    case 'pistol': return '🔫';
    case 'shotgun': return '🔫🔫';
    case 'flamethrower': return '🔥';
    case 'rocket': return '🚀';
    case 'nuke': return '☢️';
    default: return '🔫';
  }
}
