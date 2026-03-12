import React, { useRef, useEffect, useState, useCallback } from "react";
import { useZombieGame } from "../lib/stores/useZombieGame";

interface Zombie2D {
  id: string;
  x: number;
  y: number;
  targetWord: string;
  health: number;
  maxHealth: number;
  speed: number;
  angle: number;
  isTargeted: boolean;
  color: string;
  spriteFrame: number;
}

interface Player2D {
  x: number;
  y: number;
  angle: number;
}

interface Bullet2D {
  id: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  damage: number;
}

export function Game2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  const { 
    zombies: storeZombies, 
    currentWord, 
    currentIndex,
    currentWeapon, 
    score, 
    lives,
    gameState,
    spawnZombie,
    startGame
  } = useZombieGame();

  const [player] = useState<Player2D>({ x: 600, y: 400, angle: 0 });
  const [zombies2D, setZombies2D] = useState<Zombie2D[]>([]);
  const [bullets, setBullets] = useState<Bullet2D[]>([]);
  const [gameTime, setGameTime] = useState(0);

  // Much larger canvas to match reference
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 800;
  const GAME_AREA_WIDTH = 800;
  const GAME_AREA_HEIGHT = 600;
  const GAME_AREA_X = (CANVAS_WIDTH - GAME_AREA_WIDTH) / 2;
  const GAME_AREA_Y = (CANVAS_HEIGHT - GAME_AREA_HEIGHT) / 2;
  
  const PLAYER_SIZE = 32;
  const ZOMBIE_SIZE = 32;
  const BULLET_SIZE = 8;
  const TILE_SIZE = 32;

  // Start the game when component mounts
  useEffect(() => {
    if (gameState !== 'playing') {
      startGame();
    }
  }, [gameState, startGame]);

  // Force spawn initial zombies
  useEffect(() => {
    if (gameState === 'playing' && storeZombies.length === 0) {
      // Spawn a few initial zombies
      spawnZombie();
      setTimeout(() => spawnZombie(), 500);
      setTimeout(() => spawnZombie(), 1000);
    }
  }, [gameState, storeZombies.length, spawnZombie]);

  // Convert store zombies to 2D zombies
  useEffect(() => {
    if (storeZombies.length > 0) {
      const newZombies2D = storeZombies.map((zombie, index) => {
        // Spawn zombies around the edges of the game area
        const side = index % 4;
        let x, y;
        
        switch (side) {
          case 0: // Top
            x = GAME_AREA_X + Math.random() * GAME_AREA_WIDTH;
            y = GAME_AREA_Y + ZOMBIE_SIZE;
            break;
          case 1: // Right
            x = GAME_AREA_X + GAME_AREA_WIDTH - ZOMBIE_SIZE;
            y = GAME_AREA_Y + Math.random() * GAME_AREA_HEIGHT;
            break;
          case 2: // Bottom
            x = GAME_AREA_X + Math.random() * GAME_AREA_WIDTH;
            y = GAME_AREA_Y + GAME_AREA_HEIGHT - ZOMBIE_SIZE;
            break;
          case 3: // Left
            x = GAME_AREA_X + ZOMBIE_SIZE;
            y = GAME_AREA_Y + Math.random() * GAME_AREA_HEIGHT;
            break;
          default:
            x = GAME_AREA_X + Math.random() * GAME_AREA_WIDTH;
            y = GAME_AREA_Y + Math.random() * GAME_AREA_HEIGHT;
        }

        return {
          id: zombie.id,
          x,
          y,
          targetWord: zombie.targetWord,
          health: zombie.health,
          maxHealth: zombie.maxHealth,
          speed: zombie.speed * 30,
          angle: Math.atan2(player.y - y, player.x - x),
          isTargeted: zombie.isTargeted,
          color: zombie.isTargeted ? '#ff4444' : '#44ff44',
          spriteFrame: 0
        };
      });
      setZombies2D(newZombies2D);
    }
  }, [storeZombies, player.x, player.y]);

  // Draw detailed pixel art sprite
  const drawPixelCharacter = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    type: 'player' | 'zombie' | 'zombie_targeted',
    frame: number = 0
  ) => {
    const size = type === 'player' ? PLAYER_SIZE : ZOMBIE_SIZE;
    const halfSize = size / 2;
    
    if (type === 'player') {
      // Detailed player sprite (blue warrior)
      // Body
      ctx.fillStyle = '#4444aa';
      ctx.fillRect(x - halfSize + 8, y - halfSize + 8, 16, 24);
      
      // Head
      ctx.fillStyle = '#ffddaa';
      ctx.fillRect(x - halfSize + 10, y - halfSize + 2, 12, 12);
      
      // Eyes
      ctx.fillStyle = '#000000';
      ctx.fillRect(x - halfSize + 12, y - halfSize + 6, 2, 2);
      ctx.fillRect(x - halfSize + 18, y - halfSize + 6, 2, 2);
      
      // Weapon
      ctx.fillStyle = '#888888';
      ctx.fillRect(x - halfSize + 24, y - halfSize + 12, 6, 2);
      ctx.fillRect(x - halfSize + 28, y - halfSize + 10, 2, 6);
      
      // Legs
      ctx.fillStyle = '#333333';
      ctx.fillRect(x - halfSize + 10, y - halfSize + 28, 4, 6);
      ctx.fillRect(x - halfSize + 18, y - halfSize + 28, 4, 6);
      
    } else {
      // Detailed zombie sprite
      const baseColor = type === 'zombie_targeted' ? '#aa4444' : '#44aa44';
      
      // Body (torn clothes)
      ctx.fillStyle = baseColor;
      ctx.fillRect(x - halfSize + 8, y - halfSize + 8, 16, 24);
      
      // Tears in clothes
      ctx.fillStyle = '#222222';
      ctx.fillRect(x - halfSize + 12, y - halfSize + 16, 2, 8);
      ctx.fillRect(x - halfSize + 18, y - halfSize + 20, 2, 4);
      
      // Head (pale/green)
      ctx.fillStyle = '#aaffaa';
      ctx.fillRect(x - halfSize + 10, y - halfSize + 2, 12, 12);
      
      // Red eyes
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(x - halfSize + 12, y - halfSize + 6, 2, 2);
      ctx.fillRect(x - halfSize + 18, y - halfSize + 6, 2, 2);
      
      // Mouth
      ctx.fillStyle = '#000000';
      ctx.fillRect(x - halfSize + 14, y - halfSize + 10, 4, 2);
      
      // Arms (reaching forward)
      ctx.fillStyle = '#aaffaa';
      ctx.fillRect(x - halfSize + 4, y - halfSize + 12, 6, 4);
      ctx.fillRect(x - halfSize + 22, y - halfSize + 12, 6, 4);
      
      // Hands
      ctx.fillRect(x - halfSize + 2, y - halfSize + 14, 4, 4);
      ctx.fillRect(x - halfSize + 26, y - halfSize + 14, 4, 4);
      
      // Legs (shambling)
      const legOffset = Math.sin(frame * 0.1) * 2;
      ctx.fillStyle = '#333333';
      ctx.fillRect(x - halfSize + 10, y - halfSize + 28 + legOffset, 4, 6);
      ctx.fillRect(x - halfSize + 18, y - halfSize + 28 - legOffset, 4, 6);
    }
  };

  // Draw word prompt above zombie
  const drawWordPrompt = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    word: string,
    currentIdx: number,
    isTargeted: boolean
  ) => {
    const promptY = y - ZOMBIE_SIZE - 20;
    const promptWidth = word.length * 12 + 16;
    const promptHeight = 24;
    const promptX = x - promptWidth / 2;

    // Background
    ctx.fillStyle = isTargeted ? '#ffff00' : '#000000';
    ctx.fillRect(promptX, promptY, promptWidth, promptHeight);
    
    // Border
    ctx.strokeStyle = isTargeted ? '#000000' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(promptX, promptY, promptWidth, promptHeight);

    // Draw each character
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    
    for (let i = 0; i < word.length; i++) {
      const charX = promptX + 8 + (i * 12);
      const charY = promptY + 16;
      
      if (i < currentIdx) {
        // Completed characters - green
        ctx.fillStyle = isTargeted ? '#008800' : '#00ff00';
      } else if (i === currentIdx) {
        // Current character - red
        ctx.fillStyle = isTargeted ? '#880000' : '#ff0000';
      } else {
        // Remaining characters
        ctx.fillStyle = isTargeted ? '#000000' : '#ffffff';
      }
      
      ctx.fillText(word[i], charX, charY);
    }
  };

  // Draw stone border like in reference
  const drawStoneBorder = (ctx: CanvasRenderingContext2D) => {
    const borderThickness = 64;
    
    // Outer dark stone
    ctx.fillStyle = '#555566';
    ctx.fillRect(0, 0, CANVAS_WIDTH, borderThickness); // Top
    ctx.fillRect(0, CANVAS_HEIGHT - borderThickness, CANVAS_WIDTH, borderThickness); // Bottom
    ctx.fillRect(0, 0, borderThickness, CANVAS_HEIGHT); // Left
    ctx.fillRect(CANVAS_WIDTH - borderThickness, 0, borderThickness, CANVAS_HEIGHT); // Right
    
    // Inner stone details
    ctx.fillStyle = '#666677';
    for (let x = 0; x < CANVAS_WIDTH; x += 32) {
      for (let y = 0; y < borderThickness; y += 32) {
        if ((x + y) % 64 === 0) {
          ctx.fillRect(x, y, 30, 30); // Top border stones
          ctx.fillRect(x, CANVAS_HEIGHT - borderThickness + y, 30, 30); // Bottom border stones
        }
      }
    }
    
    for (let y = 0; y < CANVAS_HEIGHT; y += 32) {
      for (let x = 0; x < borderThickness; x += 32) {
        if ((x + y) % 64 === 0) {
          ctx.fillRect(x, y, 30, 30); // Left border stones
          ctx.fillRect(CANVAS_WIDTH - borderThickness + x, y, 30, 30); // Right border stones
        }
      }
    }
    
    // Hearts in top border (like reference)
    for (let i = 0; i < lives; i++) {
      const heartX = 100 + (i * 50);
      const heartY = 20;
      
      // Draw pixel heart
      ctx.fillStyle = '#ff4444';
      // Heart shape using rectangles
      ctx.fillRect(heartX + 4, heartY + 2, 4, 4);
      ctx.fillRect(heartX + 12, heartY + 2, 4, 4);
      ctx.fillRect(heartX + 2, heartY + 6, 8, 4);
      ctx.fillRect(heartX + 10, heartY + 6, 8, 4);
      ctx.fillRect(heartX + 4, heartY + 10, 12, 4);
      ctx.fillRect(heartX + 6, heartY + 14, 8, 4);
      ctx.fillRect(heartX + 8, heartY + 18, 4, 4);
    }
  };

  // Draw dungeon floor like in reference
  const drawDungeonFloor = (ctx: CanvasRenderingContext2D) => {
    // Brown stone floor
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(GAME_AREA_X, GAME_AREA_Y, GAME_AREA_WIDTH, GAME_AREA_HEIGHT);
    
    // Floor tile pattern
    ctx.fillStyle = '#9B8365';
    for (let x = GAME_AREA_X; x < GAME_AREA_X + GAME_AREA_WIDTH; x += TILE_SIZE) {
      for (let y = GAME_AREA_Y; y < GAME_AREA_Y + GAME_AREA_HEIGHT; y += TILE_SIZE) {
        if ((x + y) % (TILE_SIZE * 2) === 0) {
          ctx.fillRect(x, y, TILE_SIZE - 2, TILE_SIZE - 2);
        }
      }
    }
    
    // Add some scattered rocks/debris
    ctx.fillStyle = '#666666';
    for (let i = 0; i < 20; i++) {
      const rockX = GAME_AREA_X + Math.random() * GAME_AREA_WIDTH;
      const rockY = GAME_AREA_Y + Math.random() * GAME_AREA_HEIGHT;
      ctx.fillRect(rockX, rockY, 4, 4);
    }
  };

  // Spawn bullet when typing complete word
  const spawnBullet = useCallback((targetZombie: Zombie2D) => {
    const angle = Math.atan2(targetZombie.y - player.y, targetZombie.x - player.x);
    const newBullet: Bullet2D = {
      id: Date.now().toString(),
      x: player.x,
      y: player.y,
      angle,
      speed: 400,
      damage: getWeaponDamage(currentWeapon)
    };
    setBullets(prev => [...prev, newBullet]);
  }, [player, currentWeapon]);

  // Get weapon damage based on current weapon
  const getWeaponDamage = (weapon: string): number => {
    switch (weapon) {
      case 'pistol': return 1;
      case 'shotgun': return 3;
      case 'flamethrower': return 2;
      case 'rocket': return 5;
      case 'nuke': return 10;
      default: return 1;
    }
  };

  // Main game loop
  const gameLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const deltaTime = (timestamp - gameTime) / 1000;
    setGameTime(timestamp);

    // Clear canvas
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw environment
    drawStoneBorder(ctx);
    drawDungeonFloor(ctx);

    // Update and draw zombies
    setZombies2D(prevZombies => {
      return prevZombies.map(zombie => {
        // Move zombie toward player
        const angle = Math.atan2(player.y - zombie.y, player.x - zombie.x);
        const newX = Math.max(GAME_AREA_X + ZOMBIE_SIZE/2, 
                    Math.min(GAME_AREA_X + GAME_AREA_WIDTH - ZOMBIE_SIZE/2,
                    zombie.x + Math.cos(angle) * zombie.speed * deltaTime));
        const newY = Math.max(GAME_AREA_Y + ZOMBIE_SIZE/2,
                    Math.min(GAME_AREA_Y + GAME_AREA_HEIGHT - ZOMBIE_SIZE/2,
                    zombie.y + Math.sin(angle) * zombie.speed * deltaTime));

        const updatedZombie = { 
          ...zombie, 
          x: newX, 
          y: newY, 
          angle,
          spriteFrame: zombie.spriteFrame + 1
        };
        
        // Draw zombie
        drawPixelCharacter(
          ctx, 
          updatedZombie.x, 
          updatedZombie.y, 
          updatedZombie.isTargeted ? 'zombie_targeted' : 'zombie',
          updatedZombie.spriteFrame
        );
        
        // Draw word prompt above zombie
        if (updatedZombie.isTargeted && currentWord) {
          drawWordPrompt(
            ctx,
            updatedZombie.x,
            updatedZombie.y,
            currentWord,
            currentIndex,
            true
          );
        } else if (updatedZombie.targetWord) {
          drawWordPrompt(
            ctx,
            updatedZombie.x,
            updatedZombie.y,
            updatedZombie.targetWord,
            0,
            false
          );
        }
        
        // Draw health bar above zombie (below word)
        const barWidth = 24;
        const barHeight = 4;
        const healthPercent = updatedZombie.health / updatedZombie.maxHealth;
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(updatedZombie.x - barWidth/2, updatedZombie.y - ZOMBIE_SIZE/2 - 50, barWidth, barHeight);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(updatedZombie.x - barWidth/2 + 1, updatedZombie.y - ZOMBIE_SIZE/2 - 49, barWidth - 2, barHeight - 2);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(updatedZombie.x - barWidth/2 + 1, updatedZombie.y - ZOMBIE_SIZE/2 - 49, (barWidth - 2) * healthPercent, barHeight - 2);

        return updatedZombie;
      });
    });

    // Update and draw bullets
    setBullets(prevBullets => {
      return prevBullets
        .map(bullet => {
          const newX = bullet.x + Math.cos(bullet.angle) * bullet.speed * deltaTime;
          const newY = bullet.y + Math.sin(bullet.angle) * bullet.speed * deltaTime;
          
          const updatedBullet = { ...bullet, x: newX, y: newY };
          
          // Draw bullet as yellow projectile
          ctx.fillStyle = '#ffff00';
          ctx.fillRect(updatedBullet.x - BULLET_SIZE/2, updatedBullet.y - BULLET_SIZE/2, BULLET_SIZE, BULLET_SIZE);
          
          return updatedBullet;
        })
        .filter(bullet => 
          bullet.x > GAME_AREA_X && bullet.x < GAME_AREA_X + GAME_AREA_WIDTH && 
          bullet.y > GAME_AREA_Y && bullet.y < GAME_AREA_Y + GAME_AREA_HEIGHT
        );
    });

    // Check bullet-zombie collisions
    setBullets(prevBullets => {
      const remainingBullets: Bullet2D[] = [];
      
      prevBullets.forEach(bullet => {
        let hit = false;
        
        setZombies2D(prevZombies => {
          return prevZombies.map(zombie => {
            if (hit) return zombie;
            
            const distance = Math.sqrt(
              Math.pow(bullet.x - zombie.x, 2) + Math.pow(bullet.y - zombie.y, 2)
            );
            
            if (distance < ZOMBIE_SIZE/2) {
              hit = true;
              const newHealth = zombie.health - bullet.damage;
              
              if (newHealth <= 0) {
                return null;
              } else {
                return { ...zombie, health: newHealth };
              }
            }
            
            return zombie;
          }).filter(Boolean) as Zombie2D[];
        });
        
        if (!hit) {
          remainingBullets.push(bullet);
        }
      });
      
      return remainingBullets;
    });

    // Draw player in center
    drawPixelCharacter(ctx, player.x, player.y, 'player');

    // Continue animation loop
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameTime, player, currentWord, currentIndex]);

  // Handle word completion
  useEffect(() => {
    const targetZombie = zombies2D.find(z => z.isTargeted);
    if (targetZombie && currentWord && currentIndex === currentWord.length) {
      spawnBullet(targetZombie);
    }
  }, [currentWord, currentIndex, zombies2D, spawnBullet]);

  // Start game loop
  useEffect(() => {
    if (gameState === 'playing') {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop, gameState]);

  // Spawn zombies periodically
  useEffect(() => {
    let spawnInterval: NodeJS.Timeout;
    
    if (gameState === 'playing') {
      spawnInterval = setInterval(() => {
        if (zombies2D.length < 6) {
          spawnZombie();
        }
      }, 3000);
    }

    return () => {
      if (spawnInterval) {
        clearInterval(spawnInterval);
      }
    };
  }, [zombies2D.length, spawnZombie, gameState]);

  if (gameState !== 'playing') {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black text-white text-2xl">
        Loading game...
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-black p-4">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-gray-600"
        style={{
          imageRendering: 'pixelated',
          filter: 'contrast(1.1) brightness(1.05)',
          maxWidth: '100vw',
          maxHeight: '100vh',
          objectFit: 'contain'
        }}
      />
    </div>
  );
} 