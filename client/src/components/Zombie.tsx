import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Mesh, Group } from "three";
import * as THREE from "three";
import { ParticleSystem } from "./ParticleSystem";
import { ExplosionEffect } from "./ExplosionEffect";
import { WeaponImpactSystem } from "./WeaponImpactSystem";
import { BloodSplatter } from "./BloodSplatter";
import { WordPrompt } from "./WordPrompt";
import { useZombieGame } from "../lib/stores/useZombieGame";

interface ZombieProps {
  zombie: {
    id: string;
    position: THREE.Vector3;
    health: number;
    speed: number;
    maxHealth: number;
    targetWord: string;
    distanceToPlayer: number;
    isTargeted: boolean;
    animationState: 'walking' | 'attacking' | 'dying' | 'dead';
    deathTime?: number;
    hitEffect?: {
      position: THREE.Vector3;
      type: 'pistol' | 'shotgun' | 'flamethrower' | 'rocket' | 'nuke';
      time: number;
    };
  };
}

export function Zombie({ zombie }: ZombieProps) {
  const groupRef = useRef<Group>(null);
  const modelRef = useRef<Group>(null);
  
  const [animationTime, setAnimationTime] = useState(0);
  const [explosionActive, setExplosionActive] = useState(false);
  const [weaponImpactActive, setWeaponImpactActive] = useState(false);
  const [bloodSplatterActive, setBloodSplatterActive] = useState(false);
  const [randomExplosionChance] = useState(() => Math.random());
  const { currentIndex, currentWeapon } = useZombieGame();
  
  // Load different zombie models for variety
  const zombieModels = [
    useGLTF('/models/zombie_01.glb'),
    useGLTF('/models/zombie_02.glb'),
    useGLTF('/models/zombie_03.glb')
  ];
  
  // Select model based on zombie ID for consistency
  const selectedModel = useMemo(() => {
    const modelIndex = Math.abs(zombie.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 3;
    return zombieModels[modelIndex];
  }, [zombie.id, zombieModels]);

  // Trigger explosion effect when zombie dies
  useFrame((state, delta) => {
    setAnimationTime(prev => prev + delta);
    
    if (groupRef.current) {
      const time = state.clock.elapsedTime + zombie.id.length;
      
      // Position the entire zombie group
      groupRef.current.position.copy(zombie.position);
      
      // Trigger explosion and weapon impact when zombie starts dying
      if (zombie.animationState === 'dying' && !explosionActive) {
        setExplosionActive(true);
        setWeaponImpactActive(true);
        setBloodSplatterActive(true);
        // Reset effects after animation
        setTimeout(() => {
          setExplosionActive(false);
          setWeaponImpactActive(false);
          setBloodSplatterActive(false);
        }, 4000);
      }
      
      // Realistic zombie shambling animation
      if (zombie.animationState === 'walking' && modelRef.current) {
        // Zombie shamble - irregular limping gait
        const walkCycle = time * 3; // Slower zombie walk
        const stepPhase = Math.sin(walkCycle);
        const irregularity = Math.sin(walkCycle * 1.7) * 0.3; // Irregular timing
        
        // Body swaying side to side (zombie shamble)
        modelRef.current.rotation.z = Math.sin(walkCycle * 0.8) * 0.15 + irregularity * 0.1;
        
        // Forward lean (zombie posture)
        modelRef.current.rotation.x = -0.2 + Math.sin(walkCycle * 0.5) * 0.1;
        
        // Irregular head movements
        modelRef.current.rotation.y = Math.sin(walkCycle * 1.3) * 0.2;
        
        // Vertical bobbing with limp
        modelRef.current.position.y = Math.abs(stepPhase) * 0.08 + irregularity * 0.05;
        
        // Slight forward momentum variations
        modelRef.current.position.z += Math.sin(walkCycle * 2) * 0.002;
        
        // Random explosion chance (1% chance for dramatic effect)
        if (randomExplosionChance < 0.01 && Math.random() < 0.0001 && !explosionActive) {
          setExplosionActive(true);
          setWeaponImpactActive(true);
          setBloodSplatterActive(true);
          setTimeout(() => {
            setExplosionActive(false);
            setWeaponImpactActive(false);
            setBloodSplatterActive(false);
          }, 4000);
        }
      }
      
      // Aggressive attacking animation
      else if (zombie.animationState === 'attacking' && modelRef.current) {
        // Lunging forward motion
        modelRef.current.rotation.x = -0.3 + Math.sin(time * 20) * 0.3;
        modelRef.current.position.y = Math.sin(time * 20) * 0.2;
        modelRef.current.scale.setScalar(1 + Math.sin(time * 25) * 0.1);
      }
      
      // Spectacular death animation with explosion
      else if (zombie.animationState === 'dying' && modelRef.current) {
        const deathProgress = zombie.deathTime ? 
          Math.min(1, (Date.now() - zombie.deathTime) / 1000) : 0;
        
        // Explosive death - model fragments and disappears
        modelRef.current.rotation.x = deathProgress * Math.PI * 2;
        modelRef.current.rotation.y = deathProgress * Math.PI * 1.5;
        modelRef.current.rotation.z = deathProgress * Math.PI;
        modelRef.current.scale.setScalar(1 - deathProgress * 0.8);
        modelRef.current.position.y = -deathProgress * 2;
        
        // Add violent shaking during explosion
        if (deathProgress < 0.5) {
          modelRef.current.position.x += (Math.random() - 0.5) * 0.3;
          modelRef.current.position.z += (Math.random() - 0.5) * 0.3;
        }
      }
    }
  });

  // Dynamic color based on health and state
  const zombieColor = useMemo(() => {
    const healthRatio = zombie.health / zombie.maxHealth;
    
    if (zombie.animationState === 'dying' || zombie.animationState === 'dead') {
      return new THREE.Color(0.2, 0.2, 0.2); // Dark gray for dead
    }
    
    if (zombie.isTargeted) {
      return new THREE.Color().setHSL(0, 0.9, 0.4); // Bright red for targeted
    }
    
    // Health-based coloring (sickly green to dark red)
    return new THREE.Color().setHSL(0.3 * healthRatio, 0.8, 0.3 + healthRatio * 0.2);
  }, [zombie.health, zombie.maxHealth, zombie.animationState, zombie.isTargeted]);

  return (
    <group ref={groupRef}>
      {/* Photorealistic 3D Zombie Model */}
      <group ref={modelRef} scale={2.5}>
        <primitive 
          object={selectedModel.scene.clone()} 
          castShadow 
          receiveShadow
        />
      </group>
      
      {/* Particle effects when hit */}
      {zombie.hitEffect && Date.now() - zombie.hitEffect.time < 1000 && (
        <ParticleSystem
          position={zombie.hitEffect.position}
          type={zombie.hitEffect.type}
          intensity={1}
        />
      )}
      
      {/* Spectacular Blood Splatter Effects */}
      <BloodSplatter
        position={zombie.position}
        intensity={currentWeapon.damage}
        active={bloodSplatterActive}
      />

      {/* Spectacular Weapon Impact Effects with Flying Limbs */}
      <WeaponImpactSystem
        position={zombie.position}
        weaponType={currentWeapon.name as 'pistol' | 'shotgun' | 'flamethrower' | 'rocket' | 'nuke'}
        active={weaponImpactActive}
        onComplete={() => setWeaponImpactActive(false)}
      />

      {/* Spectacular Explosion Effect when zombie dies */}
      <ExplosionEffect
        position={zombie.position}
        active={explosionActive}
        onComplete={() => setExplosionActive(false)}
      />
      
      {/* Death explosion for rocket launcher */}
      {zombie.animationState === 'dying' && zombie.hitEffect?.type === 'rocket' && (
        <ParticleSystem
          position={zombie.position}
          type="rocket"
          intensity={3}
        />
      )}
      
      {/* Word prompt above zombie */}
      <WordPrompt
        word={zombie.targetWord}
        position={zombie.position}
        isTargeted={zombie.isTargeted}
        currentIndex={zombie.isTargeted ? currentIndex : 0}
        isCompleted={zombie.animationState === 'dead'}
      />
    </group>
  );
}
