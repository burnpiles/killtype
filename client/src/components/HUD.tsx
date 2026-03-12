import React, { useState, useEffect } from "react";
import { useZombieGame } from "../lib/stores/useZombieGame";
import { useAudio } from "../lib/stores/useAudio";
import { getWeaponConfig } from "../lib/weaponConfig";

export function HUD() {
  const {
    lives,
    score,
    level,
    wpm,
    accuracy,
    streak,
    currentWeapon,
    zombies,
    gameState,
    currentWord,
    currentIndex
  } = useZombieGame();

  const { isMuted, toggleMute } = useAudio();
  const [recentDamage, setRecentDamage] = useState<number>(0);
  const [comboMultiplier, setComboMultiplier] = useState<number>(1);
  const [weaponHeat, setWeaponHeat] = useState<number>(0);

  // Calculate combo multiplier based on streak
  useEffect(() => {
    if (streak >= 50) setComboMultiplier(8);
    else if (streak >= 30) setComboMultiplier(5);
    else if (streak >= 20) setComboMultiplier(3);
    else if (streak >= 10) setComboMultiplier(2);
    else setComboMultiplier(1);
  }, [streak]);

  // Weapon heat simulation
  useEffect(() => {
    if (currentWeapon === 'flamethrower') {
      setWeaponHeat(Math.min(100, weaponHeat + 5));
    } else {
      setWeaponHeat(Math.max(0, weaponHeat - 2));
    }
  }, [currentWeapon, weaponHeat]);

  if (gameState !== 'playing') return null;

  const weaponConfig = getWeaponConfig(currentWeapon);
  const targetedZombie = zombies.find(z => z.isTargeted);
  const healthPercentage = lives * 33.33;
  const threatLevel = zombies.length;

  return (
    <>
      {/* Main HUD Container */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        fontFamily: 'Inter, monospace',
        color: '#ffffff',
        zIndex: 10
      }}>
        
        {/* Top Status Bar */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          right: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.8) 100%)',
          padding: '15px 25px',
          borderRadius: '10px',
          border: '2px solid rgba(0,255,0,0.3)',
          boxShadow: '0 0 20px rgba(0,255,0,0.2)'
        }}>
          
          {/* Health Display */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{
              fontSize: '14px',
              color: '#00ff00',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              VITALS
            </div>
            
            <div style={{
              width: '200px',
              height: '8px',
              background: 'rgba(255,0,0,0.3)',
              borderRadius: '4px',
              overflow: 'hidden',
              border: '1px solid #444'
            }}>
              <div style={{
                width: `${healthPercentage}%`,
                height: '100%',
                background: healthPercentage > 60 ? 
                  'linear-gradient(90deg, #00ff00, #88ff00)' :
                  healthPercentage > 30 ?
                  'linear-gradient(90deg, #ffff00, #ff8800)' :
                  'linear-gradient(90deg, #ff0000, #aa0000)',
                transition: 'width 0.3s ease',
                boxShadow: healthPercentage < 30 ? '0 0 10px #ff0000' : 'none'
              }} />
            </div>
            
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: healthPercentage > 60 ? '#00ff00' : healthPercentage > 30 ? '#ffff00' : '#ff0000',
              textShadow: '0 0 10px currentColor'
            }}>
              {lives} ❤️
            </div>
          </div>

          {/* Score Display */}
          <div style={{
            textAlign: 'center',
            background: 'rgba(0,0,0,0.6)',
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid rgba(255,215,0,0.5)'
          }}>
            <div style={{
              fontSize: '12px',
              color: '#ffd700',
              textTransform: 'uppercase'
            }}>
              SCORE
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#ffd700',
              textShadow: '0 0 15px #ffd700'
            }}>
              {score.toLocaleString()}
            </div>
            {comboMultiplier > 1 && (
              <div style={{
                fontSize: '10px',
                color: '#ff4444',
                animation: 'pulse 1s infinite'
              }}>
                x{comboMultiplier} COMBO!
              </div>
            )}
          </div>

          {/* Performance Stats */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#00ccff' }}>WPM</div>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: 'bold',
                color: wpm > 60 ? '#00ff00' : wpm > 30 ? '#ffff00' : '#ff8800'
              }}>
                {Math.round(wpm)}
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#00ccff' }}>ACC</div>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: 'bold',
                color: accuracy > 90 ? '#00ff00' : accuracy > 70 ? '#ffff00' : '#ff8800'
              }}>
                {Math.round(accuracy)}%
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#00ccff' }}>STREAK</div>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: 'bold',
                color: streak > 30 ? '#ff4444' : streak > 10 ? '#ffff00' : '#00ff00',
                textShadow: streak > 30 ? '0 0 20px #ff4444' : 'none'
              }}>
                {streak}
              </div>
            </div>
          </div>

          {/* Audio Control */}
          <button
            onClick={toggleMute}
            style={{
              background: 'rgba(0,0,0,0.6)',
              border: '2px solid #666',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: '#fff',
              cursor: 'pointer',
              pointerEvents: 'auto',
              fontSize: '16px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={e => {
              e.target.style.border = '2px solid #00ff00';
              e.target.style.boxShadow = '0 0 10px rgba(0,255,0,0.5)';
            }}
            onMouseLeave={e => {
              e.target.style.border = '2px solid #666';
              e.target.style.boxShadow = 'none';
            }}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>

        {/* Advanced Crosshair System */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60px',
          height: '60px',
          pointerEvents: 'none'
        }}>
          {/* Dynamic crosshair based on weapon */}
          <CrosshairSystem 
            weaponType={currentWeapon}
            isTargeting={!!targetedZombie}
            accuracy={accuracy}
          />
        </div>

        {/* Weapon Information Panel */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(20,20,20,0.8) 100%)',
          padding: '20px',
          borderRadius: '12px',
          border: '2px solid rgba(0,255,255,0.4)',
          boxShadow: '0 0 25px rgba(0,255,255,0.2)',
          minWidth: '300px'
        }}>
          
          {/* Weapon Name and Type */}
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#00ffff',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            marginBottom: '10px',
            textShadow: '0 0 10px #00ffff'
          }}>
            {weaponConfig.name}
          </div>
          
          <div style={{
            fontSize: '12px',
            color: '#888',
            marginBottom: '15px',
            fontStyle: 'italic'
          }}>
            {weaponConfig.description}
          </div>

          {/* Weapon Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <WeaponStat label="DAMAGE" value={weaponConfig.damage} max={999} color="#ff4444" />
            <WeaponStat label="FIRE RATE" value={weaponConfig.fireRate} max={2} color="#ffaa00" />
            <WeaponStat label="ACCURACY" value={weaponConfig.accuracy} max={1} color="#00ff00" />
            
            {weaponHeat > 0 && (
              <WeaponStat label="HEAT" value={weaponHeat} max={100} color="#ff8800" />
            )}
          </div>

          {/* Weapon Unlock Progress */}
          {currentWeapon !== 'nuke' && (
            <div style={{ marginTop: '15px' }}>
              <div style={{
                fontSize: '11px',
                color: '#aaa',
                marginBottom: '5px'
              }}>
                NEXT WEAPON: {getNextWeaponName(currentWeapon)} 
                ({getRequiredStreak(currentWeapon) - streak} more hits)
              </div>
              <div style={{
                width: '100%',
                height: '4px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${Math.min(100, (streak / getRequiredStreak(currentWeapon)) * 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #00ff00, #ffff00)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Target Information */}
        {targetedZombie && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            background: 'rgba(255,0,0,0.2)',
            border: '2px solid #ff0000',
            borderRadius: '10px',
            padding: '15px',
            boxShadow: '0 0 20px rgba(255,0,0,0.3)'
          }}>
            <div style={{
              fontSize: '14px',
              color: '#ff4444',
              textTransform: 'uppercase',
              marginBottom: '8px'
            }}>
              🎯 TARGET ACQUIRED
            </div>
            
            <div style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '8px'
            }}>
              DISTANCE: {Math.round(targetedZombie.distanceToPlayer)}m
            </div>
            
            <div style={{
              width: '150px',
              height: '6px',
              background: 'rgba(255,0,0,0.3)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(targetedZombie.health / targetedZombie.maxHealth) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #ff0000, #ff4444)',
                transition: 'width 0.3s ease'
              }} />
            </div>
            
            <div style={{
              fontSize: '12px',
              color: '#ffaaaa',
              marginTop: '5px'
            }}>
              HP: {targetedZombie.health}/{targetedZombie.maxHealth}
            </div>
          </div>
        )}

        {/* Threat Level Indicator */}
        <div style={{
          position: 'absolute',
          top: '50%',
          right: '20px',
          transform: 'translateY(-50%)',
          background: 'rgba(0,0,0,0.8)',
          padding: '15px',
          borderRadius: '8px',
          border: `2px solid ${threatLevel > 5 ? '#ff0000' : threatLevel > 3 ? '#ffaa00' : '#00ff00'}`,
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#aaa',
            marginBottom: '5px'
          }}>
            THREAT LEVEL
          </div>
          
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: threatLevel > 5 ? '#ff0000' : threatLevel > 3 ? '#ffaa00' : '#00ff00',
            textShadow: `0 0 10px ${threatLevel > 5 ? '#ff0000' : threatLevel > 3 ? '#ffaa00' : '#00ff00'}`
          }}>
            {threatLevel}
          </div>
          
          <div style={{
            fontSize: '10px',
            color: '#888',
            marginTop: '5px'
          }}>
            HOSTILES
          </div>
        </div>

        {/* Word Display */}
        <div style={{
          position: 'absolute',
          bottom: '150px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.9)',
          padding: '20px 30px',
          borderRadius: '15px',
          border: '3px solid #00ff00',
          boxShadow: '0 0 30px rgba(0,255,0,0.4)',
          textAlign: 'center',
          minWidth: '300px'
        }}>
          <div style={{
            fontSize: '14px',
            color: '#00ff00',
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            TARGET WORD
          </div>
          
          <div style={{
            fontSize: '32px',
            fontWeight: 'bold',
            fontFamily: 'Monaco, monospace',
            letterSpacing: '3px'
          }}>
            {currentWord.split('').map((char, index) => (
              <span
                key={index}
                style={{
                  color: index < currentIndex ? '#00ff00' : 
                         index === currentIndex ? '#ffff00' : '#ffffff',
                  textShadow: index === currentIndex ? '0 0 15px #ffff00' : 'none',
                  backgroundColor: index === currentIndex ? 'rgba(255,255,0,0.2)' : 'transparent',
                  padding: '2px 4px',
                  borderRadius: '4px'
                }}
              >
                {char}
              </span>
            ))}
          </div>
          
          <div style={{
            marginTop: '10px',
            fontSize: '12px',
            color: '#888'
          }}>
            Progress: {currentIndex}/{currentWord.length}
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 10px currentColor; }
          50% { text-shadow: 0 0 20px currentColor, 0 0 30px currentColor; }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
      `}</style>
    </>
  );
}

// Weapon stat component
function WeaponStat({ label, value, max, color }: { 
  label: string; 
  value: number; 
  max: number; 
  color: string; 
}) {
  const percentage = Math.min(100, (value / max) * 100);
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        fontSize: '10px',
        color: '#aaa',
        minWidth: '60px',
        textTransform: 'uppercase'
      }}>
        {label}
      </div>
      
      <div style={{
        flex: 1,
        height: '6px',
        background: 'rgba(255,255,255,0.2)',
        borderRadius: '3px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color}, ${color}AA)`,
          transition: 'width 0.3s ease'
        }} />
      </div>
      
      <div style={{
        fontSize: '11px',
        color: color,
        fontWeight: 'bold',
        minWidth: '30px',
        textAlign: 'right'
      }}>
        {value}
      </div>
    </div>
  );
}

// Advanced crosshair system
function CrosshairSystem({ weaponType, isTargeting, accuracy }: {
  weaponType: string;
  isTargeting: boolean;
  accuracy: number;
}) {
  const crosshairColor = isTargeting ? '#ff0000' : '#00ff00';
  const crosshairOpacity = 0.8 + (accuracy / 100) * 0.2;
  
  const baseStyle = {
    position: 'absolute' as const,
    backgroundColor: crosshairColor,
    boxShadow: `0 0 10px ${crosshairColor}`,
    opacity: crosshairOpacity
  };

  return (
    <>
      {/* Horizontal line */}
      <div style={{
        ...baseStyle,
        width: '30px',
        height: '2px',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }} />
      
      {/* Vertical line */}
      <div style={{
        ...baseStyle,
        width: '2px',
        height: '30px',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }} />
      
      {/* Center dot */}
      <div style={{
        ...baseStyle,
        width: '4px',
        height: '4px',
        borderRadius: '50%',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }} />
      
      {/* Weapon-specific crosshair elements */}
      {weaponType === 'shotgun' && (
        <>
          <div style={{
            ...baseStyle,
            width: '40px',
            height: '40px',
            border: `1px solid ${crosshairColor}`,
            borderRadius: '50%',
            backgroundColor: 'transparent',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }} />
        </>
      )}
      
      {weaponType === 'rocket' && (
        <>
          <div style={{
            ...baseStyle,
            width: '60px',
            height: '60px',
            border: `2px solid ${crosshairColor}`,
            backgroundColor: 'transparent',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }} />
        </>
      )}
      
      {weaponType === 'nuke' && (
        <>
          <div style={{
            ...baseStyle,
            width: '80px',
            height: '80px',
            border: `3px solid ${crosshairColor}`,
            backgroundColor: 'transparent',
            borderRadius: '50%',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'pulse 1s infinite'
          }} />
        </>
      )}
    </>
  );
}

// Helper functions
function getNextWeaponName(currentWeapon: string): string {
  const weapons = {
    'pistol': 'Shotgun',
    'shotgun': 'Flamethrower',
    'flamethrower': 'Rocket Launcher',
    'rocket': 'Nuclear Device',
    'nuke': 'MAX LEVEL'
  };
  return weapons[currentWeapon] || 'Unknown';
}

function getRequiredStreak(currentWeapon: string): number {
  const requirements = {
    'pistol': 10,
    'shotgun': 20,
    'flamethrower': 30,
    'rocket': 50
  };
  return requirements[currentWeapon] || 999;
}