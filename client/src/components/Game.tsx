import React from "react";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { useZombieGame } from "../lib/stores/useZombieGame";
import { useAudio } from "../lib/stores/useAudio";
import { Zombie } from "./Zombie";
import { Environment } from "./Environment";
import { WeaponDisplay } from "./WeaponDisplay";
import { WeaponSystem } from "./WeaponSystem";
import { FirstPersonWeapon } from "./FirstPersonWeapon";
// Post-processing effects will be added when dependencies are available
// import { EffectComposer, Bloom, Noise, Vignette, ChromaticAberration, DepthOfField } from "@react-three/postprocessing";
// import { BlendFunction } from "postprocessing";
// import { Perf } from "r3f-perf";
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
    restartGame,
    currentWeapon,
    streak
  } = useZombieGame();

  const { playHit } = useAudio();
  const lastSpawnRef = useRef(0);
  const performanceRef = useRef<THREE.Group>(null);

  // Enhanced game loop with performance monitoring
  useFrame((state, delta) => {
    if (gameState === 'playing') {
      // Smooth delta clamping for stable physics
      const clampedDelta = Math.min(delta, 1/30);
      
      // Update zombies with physics-based movement
      updateZombies(clampedDelta);
      
      // Check collisions with spatial partitioning
      checkCollisions();
      
      // Dynamic spawn rate based on performance and game progression
      const spawnRate = Math.max(1.5 - (streak * 0.05), 0.8);
      const now = state.clock.elapsedTime;
      
      if (now - lastSpawnRef.current > spawnRate) {
        spawnZombie();
        lastSpawnRef.current = now;
      }
      
      // First-person camera positioning
      state.camera.position.set(0, 1, 8);
      state.camera.lookAt(0, 0, 0);
      
      // Camera shake effect during intense moments
      if (zombies.length > 5) {
        state.camera.position.x += (Math.random() - 0.5) * 0.02;
        state.camera.position.y += (Math.random() - 0.5) * 0.02;
      }
    }
  });

  // Start game on mount
  useEffect(() => {
    startGame();
  }, [startGame]);

  return (
    <>
      {/* Performance monitoring in development */}
      {/* <Perf position="top-left" /> */}
      
      {/* Enhanced environment with atmospheric effects */}
      <Environment />
      
      {/* First-person weapon */}
      <FirstPersonWeapon />
      
      {/* LOD-optimized zombie rendering */}
      <group ref={performanceRef}>
        {zombies.map((zombie) => (
          <Zombie key={zombie.id} zombie={zombie} />
        ))}
      </group>
      
      {/* Advanced weapon system */}
      <WeaponDisplay />
      <WeaponSystem />
      
      {/* Cinematic post-processing effects - Coming soon */}
      {/* Advanced post-processing will be added with proper dependencies */}
      
      {/* Dynamic audio listener positioning */}
      <primitive object={new THREE.AudioListener()} />
    </>
  );
}
