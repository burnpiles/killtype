import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { useZombieGame } from "../lib/stores/useZombieGame";
import { useAudio } from "../lib/stores/useAudio";
import { Zombie } from "./Zombie";
import { Environment } from "./Environment";
import { WeaponDisplay } from "./WeaponDisplay";
import { TypingInterface } from "./TypingInterface";
import { HUD } from "./HUD";
import { WeaponSystem } from "./WeaponSystem";
import * as THREE from "three";

export function Game() {
  const {
    zombies,
    gameState,
    currentWord,
    currentIndex,
    spawnZombie,
    updateZombies,
    checkCollisions,
    startGame,
    restartGame
  } = useZombieGame();

  const { playHit } = useAudio();
  const lastSpawnRef = useRef(0);

  // Game loop
  useFrame((state, delta) => {
    if (gameState === 'playing') {
      // Update zombies
      updateZombies(delta);
      
      // Check collisions
      checkCollisions();
      
      // Spawn zombies at intervals
      const now = state.clock.elapsedTime;
      if (now - lastSpawnRef.current > 2) {
        spawnZombie();
        lastSpawnRef.current = now;
      }
    }
  });

  // Start game on mount
  useEffect(() => {
    startGame();
  }, [startGame]);

  return (
    <>
      <Environment />
      
      {/* Render zombies */}
      {zombies.map((zombie) => (
        <Zombie key={zombie.id} zombie={zombie} />
      ))}
      
      {/* Visible weapon on screen */}
      <WeaponDisplay />
      
      {/* Simple visual effects without buffer issues */}
      
      <WeaponSystem />
    </>
  );
}
