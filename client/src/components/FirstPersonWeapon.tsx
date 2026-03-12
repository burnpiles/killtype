import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useZombieGame } from "../lib/stores/useZombieGame";
import * as THREE from "three";

export function FirstPersonWeapon() {
  const weaponRef = useRef<THREE.Group>(null);
  const barrelRef = useRef<THREE.Mesh>(null);
  const sightRef = useRef<THREE.Mesh>(null);
  
  const { currentWeapon, zombies, currentIndex, currentWord } = useZombieGame();
  
  // Get currently targeted zombie
  const targetZombie = useMemo(() => {
    return zombies.find(zombie => 
      zombie.targetWord === currentWord && zombie.isTargeted
    );
  }, [zombies, currentWord]);

  // Weapon configuration based on current weapon type
  const weaponConfig = useMemo(() => {
    switch (currentWeapon) {
      case 'pistol':
        return {
          size: [0.05, 0.05, 0.3],
          color: '#2a2a2a',
          barrelLength: 0.2,
          position: [0.4, -0.3, -0.1]
        };
      case 'shotgun':
        return {
          size: [0.08, 0.08, 0.5],
          color: '#1a1a1a',
          barrelLength: 0.4,
          position: [0.5, -0.2, -0.2]
        };
      case 'flamethrower':
        return {
          size: [0.12, 0.12, 0.4],
          color: '#8B4513',
          barrelLength: 0.3,
          position: [0.6, -0.1, -0.3]
        };
      case 'rocket':
        return {
          size: [0.15, 0.15, 0.6],
          color: '#4a4a4a',
          barrelLength: 0.5,
          position: [0.7, 0, -0.4]
        };
      case 'nuke':
        return {
          size: [0.2, 0.2, 0.8],
          color: '#FFD700',
          barrelLength: 0.6,
          position: [0.8, 0.1, -0.5]
        };
      default:
        return {
          size: [0.05, 0.05, 0.3],
          color: '#2a2a2a',
          barrelLength: 0.2,
          position: [0.4, -0.3, -0.1]
        };
    }
  }, [currentWeapon]);

  useFrame((state) => {
    if (!weaponRef.current || !targetZombie) return;
    
    // Position weapon in first-person view
    weaponRef.current.position.set(weaponConfig.position[0], weaponConfig.position[1], weaponConfig.position[2]);
    
    // Calculate aiming direction toward target zombie
    const weaponWorldPosition = new THREE.Vector3();
    weaponRef.current.getWorldPosition(weaponWorldPosition);
    
    const targetPosition = targetZombie.position.clone();
    targetPosition.y += 1; // Aim at zombie's chest
    
    const aimDirection = targetPosition.clone().sub(weaponWorldPosition).normalize();
    
    // Smoothly rotate weapon to point at target
    const targetRotation = new THREE.Euler();
    targetRotation.setFromVector3(aimDirection);
    
    // Smooth aiming movement
    weaponRef.current.rotation.x = THREE.MathUtils.lerp(
      weaponRef.current.rotation.x,
      Math.atan2(-aimDirection.y, Math.sqrt(aimDirection.x * aimDirection.x + aimDirection.z * aimDirection.z)),
      0.1
    );
    
    weaponRef.current.rotation.y = THREE.MathUtils.lerp(
      weaponRef.current.rotation.y,
      Math.atan2(aimDirection.x, aimDirection.z),
      0.1
    );

    // Weapon sway and breathing effect
    const time = state.clock.elapsedTime;
    const breathingSway = Math.sin(time * 1.5) * 0.005;
    const heartbeat = Math.sin(time * 6) * 0.002;
    
    weaponRef.current.position.y += breathingSway;
    weaponRef.current.position.x += heartbeat;
    weaponRef.current.rotation.z = breathingSway * 0.5;
  });

  return (
    <group ref={weaponRef}>
      {/* Main weapon body */}
      <mesh position={[0, 0, weaponConfig.barrelLength / 2]}>
        <boxGeometry args={[weaponConfig.size[0], weaponConfig.size[1], weaponConfig.size[2]]} />
        <meshStandardMaterial 
          color={weaponConfig.color}
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>
      
      {/* Weapon barrel */}
      <mesh ref={barrelRef} position={[0, 0, -weaponConfig.barrelLength / 2]}>
        <cylinderGeometry args={[0.02, 0.03, weaponConfig.barrelLength, 8]} />
        <meshStandardMaterial 
          color="#1a1a1a"
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>
      
      {/* Iron sights */}
      <mesh ref={sightRef} position={[0, 0.04, weaponConfig.barrelLength * 0.8]}>
        <boxGeometry args={[0.01, 0.02, 0.01]} />
        <meshStandardMaterial 
          color="#ffffff"
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>
      
      {/* Targeting laser (visible when aiming) */}
      {targetZombie && (
        <mesh position={[0, -0.01, -weaponConfig.barrelLength]}>
          <cylinderGeometry args={[0.001, 0.001, 10]} />
          <meshBasicMaterial 
            color="#ff0000"
            transparent
            opacity={0.8}
          />
        </mesh>
      )}
      
      {/* Weapon grip */}
      <mesh position={[0, -0.05, weaponConfig.barrelLength * 0.6]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.03, 0.08, 0.02]} />
        <meshStandardMaterial 
          color="#654321"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* Weapon scope (for advanced weapons) */}
      {(currentWeapon === 'rocket' || currentWeapon === 'nuke') && (
        <mesh position={[0, 0.06, weaponConfig.barrelLength * 0.3]}>
          <cylinderGeometry args={[0.02, 0.02, 0.1, 16]} />
          <meshStandardMaterial 
            color="#333333"
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>
      )}
    </group>
  );
} 