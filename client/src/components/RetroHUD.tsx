import React from "react";
import { useZombieGame } from "../lib/stores/useZombieGame";

export function RetroHUD() {
  const { 
    score, 
    lives, 
    currentWeapon, 
    wpm, 
    accuracy, 
    streak,
    level,
    gameState 
  } = useZombieGame();

  if (gameState !== 'playing') return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Top HUD Bar */}
      <div 
        className="absolute top-0 left-0 right-0 h-16 bg-black/80 border-b-2 border-green-400"
        style={{
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#00ff00',
          textShadow: '0 0 10px #00ff00'
        }}
      >
        <div className="flex justify-between items-center h-full px-4">
          {/* Left side - Lives and Score */}
          <div className="flex space-x-6">
            <div className="flex items-center">
              <span className="text-red-400">❤️</span>
              <span className="ml-1 font-bold">{lives}</span>
            </div>
            <div className="flex items-center">
              <span className="text-yellow-400">⭐</span>
              <span className="ml-1 font-bold">{score.toLocaleString()}</span>
            </div>
            <div className="flex items-center">
              <span className="text-blue-400">LVL</span>
              <span className="ml-1 font-bold">{level}</span>
            </div>
          </div>

          {/* Center - Weapon Display */}
          <div className="flex items-center bg-gray-900/80 px-4 py-2 border border-green-400">
            <div className="text-center">
              <div className="text-xs text-green-300">WEAPON</div>
              <div className="text-lg font-bold text-white">
                {getWeaponIcon(currentWeapon)} {currentWeapon.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Right side - Stats */}
          <div className="flex space-x-6">
            <div className="text-center">
              <div className="text-xs text-green-300">WPM</div>
              <div className="font-bold">{wpm}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-green-300">ACC</div>
              <div className="font-bold">{accuracy}%</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-green-300">STREAK</div>
              <div className="font-bold text-orange-400">{streak}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom corner elements */}
      <div className="absolute bottom-4 right-4">
        <div 
          className="bg-black/80 border border-green-400 px-3 py-2"
          style={{
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#00ff00'
          }}
        >
          <div className="text-center">
            <div className="text-xs text-green-300">THREAT LEVEL</div>
            <div className="text-2xl font-bold text-red-400">{Math.min(level * 2, 99)}</div>
            <div className="text-xs text-gray-400">HOSTILES</div>
          </div>
        </div>
      </div>

      {/* Pixel art corners */}
      <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-green-400"></div>
      <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-green-400"></div>
      <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-green-400"></div>
      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-green-400"></div>

      {/* Retro scan lines */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            #00ff00 2px,
            #00ff00 4px
          )`
        }}
      />
    </div>
  );
}

function getWeaponIcon(weapon: string): string {
  switch (weapon) {
    case 'pistol': return '🔫';
    case 'shotgun': return '💥';
    case 'flamethrower': return '🔥';
    case 'rocket': return '🚀';
    case 'nuke': return '☢️';
    default: return '🔫';
  }
} 