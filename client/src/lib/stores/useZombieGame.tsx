import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import * as THREE from "three";
import { generateWord } from "../wordGenerator";
import { getWeaponConfig } from "../weaponConfig";

interface Zombie {
  id: string;
  position: THREE.Vector3;
  health: number;
  maxHealth: number;
  speed: number;
  targetWord?: string;
}

interface ZombieGameState {
  // Game state
  gameState: 'menu' | 'playing' | 'gameOver' | 'victory';
  lives: number;
  score: number;
  level: number;
  
  // Typing state
  currentWord: string;
  currentIndex: number;
  missedShot: boolean;
  
  // Stats
  wpm: number;
  accuracy: number;
  streak: number;
  totalShots: number;
  hitShots: number;
  
  // Weapon system
  currentWeapon: string;
  lastShot: number | null;
  
  // Zombies
  zombies: Zombie[];
  
  // Timing
  gameStartTime: number;
  lastWordTime: number;
  
  // Actions
  startGame: () => void;
  restartGame: () => void;
  spawnZombie: () => void;
  updateZombies: (delta: number) => void;
  processKeyPress: (key: string) => void;
  checkCollisions: () => void;
  updateWeapon: () => void;
  calculateStats: () => void;
}

export const useZombieGame = create<ZombieGameState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    gameState: 'menu',
    lives: 3,
    score: 0,
    level: 1,
    
    currentWord: '',
    currentIndex: 0,
    missedShot: false,
    
    wpm: 0,
    accuracy: 100,
    streak: 0,
    totalShots: 0,
    hitShots: 0,
    
    currentWeapon: 'pistol',
    lastShot: null,
    
    zombies: [],
    
    gameStartTime: 0,
    lastWordTime: 0,
    
    startGame: () => {
      const now = Date.now();
      set({
        gameState: 'playing',
        lives: 3,
        score: 0,
        level: 1,
        streak: 0,
        totalShots: 0,
        hitShots: 0,
        currentWeapon: 'pistol',
        zombies: [],
        currentWord: generateWord(),
        currentIndex: 0,
        gameStartTime: now,
        lastWordTime: now
      });
    },
    
    restartGame: () => {
      get().startGame();
    },
    
    spawnZombie: () => {
      const state = get();
      if (state.gameState !== 'playing') return;
      
      const zombie: Zombie = {
        id: Date.now() + Math.random().toString(),
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 20,
          0,
          -12 - Math.random() * 5
        ),
        health: 1 + Math.floor(state.level / 3),
        maxHealth: 1 + Math.floor(state.level / 3),
        speed: 1 + state.level * 0.2,
        targetWord: state.currentWord
      };
      
      set(state => ({
        zombies: [...state.zombies, zombie]
      }));
    },
    
    updateZombies: (delta: number) => {
      set(state => ({
        zombies: state.zombies.map(zombie => ({
          ...zombie,
          position: new THREE.Vector3(
            zombie.position.x,
            zombie.position.y,
            zombie.position.z + zombie.speed * delta
          )
        }))
      }));
    },
    
    processKeyPress: (key: string) => {
      const state = get();
      if (state.gameState !== 'playing') return;
      
      const now = Date.now();
      
      if (key === 'Backspace') {
        if (state.currentIndex > 0) {
          set({
            currentIndex: state.currentIndex - 1,
            missedShot: false
          });
        }
        return;
      }
      
      if (key.length !== 1) return;
      
      const expectedChar = state.currentWord[state.currentIndex];
      const isCorrect = key.toLowerCase() === expectedChar.toLowerCase();
      
      set(prevState => ({
        totalShots: prevState.totalShots + 1,
        hitShots: isCorrect ? prevState.hitShots + 1 : prevState.hitShots,
        lastShot: now
      }));
      
      if (isCorrect) {
        const newIndex = state.currentIndex + 1;
        const newStreak = state.streak + 1;
        
        // Word completed
        if (newIndex >= state.currentWord.length) {
          const wordScore = getWeaponConfig(state.currentWeapon).damage * 10;
          
          set({
            currentWord: generateWord(),
            currentIndex: 0,
            missedShot: false,
            score: state.score + wordScore,
            streak: newStreak,
            lastWordTime: now,
            // Remove the first zombie (they're targeting this word)
            zombies: state.zombies.slice(1)
          });
          
          get().updateWeapon();
        } else {
          set({
            currentIndex: newIndex,
            missedShot: false,
            streak: newStreak
          });
        }
      } else {
        set({
          missedShot: true,
          streak: 0
        });
        
        // Clear missed shot indicator after a delay
        setTimeout(() => {
          set(state => ({ missedShot: false }));
        }, 200);
      }
      
      get().calculateStats();
    },
    
    checkCollisions: () => {
      const state = get();
      const zombiesAtPlayer = state.zombies.filter(z => z.position.z > 8);
      
      if (zombiesAtPlayer.length > 0) {
        const newLives = state.lives - 1;
        
        set({
          lives: newLives,
          zombies: state.zombies.filter(z => z.position.z <= 8)
        });
        
        if (newLives <= 0) {
          set({ gameState: 'gameOver' });
        }
      }
    },
    
    updateWeapon: () => {
      const state = get();
      const { streak } = state;
      
      let newWeapon = 'pistol';
      if (streak >= 50) newWeapon = 'nuke';
      else if (streak >= 30) newWeapon = 'rocket';
      else if (streak >= 20) newWeapon = 'flamethrower';
      else if (streak >= 10) newWeapon = 'shotgun';
      
      if (newWeapon !== state.currentWeapon) {
        set({ currentWeapon: newWeapon });
        
        // Perfect streak triggers nuke and level win
        if (newWeapon === 'nuke') {
          set({
            gameState: 'victory',
            zombies: [],
            score: state.score + 1000
          });
        }
      }
    },
    
    calculateStats: () => {
      const state = get();
      const now = Date.now();
      const timeElapsed = (now - state.gameStartTime) / 1000 / 60; // minutes
      
      if (timeElapsed > 0) {
        const wordsTyped = state.hitShots / 5; // Assuming 5 chars per word
        const wpm = wordsTyped / timeElapsed;
        const accuracy = state.totalShots > 0 ? (state.hitShots / state.totalShots) * 100 : 100;
        
        set({ wpm, accuracy });
      }
    }
  }))
);
