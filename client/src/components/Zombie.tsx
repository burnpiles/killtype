import React, { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, Group } from "three";
import * as THREE from "three";
import { ZombieArmsAnimation } from "./ZombieArmsAnimation";
import { ParticleSystem } from "./ParticleSystem";
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
  const [bloodSplatterActive, setBloodSplatterActive] = useState(false);
  const [damageNumbers, setDamageNumbers] = useState<Array<{
    id: string;
    damage: number;
    position: THREE.Vector3;
    time: number;
  }>>([]);
  
  const { currentIndex, currentWeapon } = useZombieGame();
  
  // Calculate zombie walk speed
  const walkSpeed = useMemo(() => 0.8 + (zombie.speed * 0.1), [zombie.speed]);

  // Advanced animation and physics system
  useFrame((state, delta) => {
    setAnimationTime(prev => prev + delta);
    
    if (groupRef.current) {
      const time = state.clock.elapsedTime + zombie.id.length;
      
      // Position the entire zombie group
      groupRef.current.position.copy(zombie.position);
      
      // Trigger explosive death effects
      if (zombie.animationState === 'dying' && !explosionActive) {
        setExplosionActive(true);
        setBloodSplatterActive(true);
        
        // Add damage numbers
        const newDamageNumber = {
          id: Date.now().toString(),
          damage: zombie.maxHealth - zombie.health,
          position: zombie.position.clone().add(new THREE.Vector3(0, 2, 0)),
          time: Date.now()
        };
        setDamageNumbers(prev => [...prev, newDamageNumber]);
        
        // Reset effects after animation
        setTimeout(() => {
          setExplosionActive(false);
          setBloodSplatterActive(false);
        }, 3000);
      }
      
      // Move zombie toward camera center (0, 0, camera position)
      if (zombie.animationState === 'walking' && modelRef.current) {
        // Calculate direction to camera/center
        const targetPosition = new THREE.Vector3(0, zombie.position.y, 8); // Move toward camera
        const direction = targetPosition.clone().sub(zombie.position).normalize();
        
        // Move zombie toward center
        zombie.position.add(direction.multiplyScalar(zombie.speed * delta));
        
        // Face the direction of movement (toward camera)
        const lookDirection = Math.atan2(direction.x, direction.z);
        groupRef.current.rotation.y = lookDirection;
        
        // Basic zombie body movement
        const walkCycle = time * walkSpeed;
        
        // Hunched zombie posture
        modelRef.current.rotation.x = -0.3; // Permanent hunch
        
        // Shambling gait with head bob
        const headBob = Math.abs(Math.sin(walkCycle * 2)) * 0.15;
        modelRef.current.position.y = headBob;
        
        // Side-to-side zombie sway
        const lateralSway = Math.sin(walkCycle) * 0.1;
        modelRef.current.rotation.z = lateralSway;
        
        // Zombie head searching motion
        const headTurn = Math.sin(walkCycle * 0.3) * 0.2;
        modelRef.current.rotation.y += headTurn;
      }
      
      // Aggressive predatory attacking stance
      else if (zombie.animationState === 'attacking' && modelRef.current) {
        // Explosive lunging motion with realistic predator kinematics
        const attackIntensity = Math.sin(time * 15) * 0.4;
        const clawSwipe = Math.sin(time * 18) * 0.3;
        
        modelRef.current.rotation.x = -0.4 + attackIntensity;
        modelRef.current.rotation.y = clawSwipe * 0.5;
        modelRef.current.position.y = Math.abs(attackIntensity) * 0.3;
        
        // Dynamic scaling for intimidation factor
        const growthPulse = 1 + Math.sin(time * 20) * 0.15;
        modelRef.current.scale.setScalar(growthPulse);
        
        // Aggressive color shift
        if (skinnedMeshRef.current && skinnedMeshRef.current.material) {
          const material = skinnedMeshRef.current.material as THREE.MeshStandardMaterial;
          material.emissive.setHex(0x440000);
          material.emissiveIntensity = 0.3 + Math.sin(time * 25) * 0.2;
        }
      }
      
      // Cinematic death sequence with realistic physics
      else if (zombie.animationState === 'dying' && modelRef.current) {
        const deathProgress = zombie.deathTime ? 
          Math.min(1, (Date.now() - zombie.deathTime) / 2000) : 0;
        
        // Realistic ragdoll physics simulation
        const fallAcceleration = deathProgress * deathProgress * 9.8;
        const tumbleRotation = deathProgress * Math.PI * 2.5;
        
        // Natural falling motion with angular momentum
        modelRef.current.rotation.x = tumbleRotation + Math.sin(deathProgress * 15) * 0.5;
        modelRef.current.rotation.y = tumbleRotation * 0.7 + Math.cos(deathProgress * 12) * 0.3;
        modelRef.current.rotation.z = tumbleRotation * 0.5;
        
        // Realistic scale reduction due to tissue collapse
        const corpseScale = Math.max(0.2, 1 - deathProgress * 0.6);
        modelRef.current.scale.setScalar(corpseScale);
        
        // Gravity simulation with bounce physics
        modelRef.current.position.y = Math.max(-1.5, -fallAcceleration + Math.sin(deathProgress * 8) * 0.1);
        
        // Blood pool expansion
        if (deathProgress > 0.3 && !bloodSplatterActive) {
          setBloodSplatterActive(true);
        }
        
        // Material decay effects
        if (skinnedMeshRef.current && skinnedMeshRef.current.material) {
          const material = skinnedMeshRef.current.material as THREE.MeshStandardMaterial;
          material.opacity = Math.max(0.1, 1 - deathProgress * 0.8);
          material.transparent = true;
          material.color.lerp(new THREE.Color(0.3, 0.2, 0.1), deathProgress * 0.5);
        }
      }
    }
    
    // Clean up old damage numbers
    setDamageNumbers(prev => 
      prev.filter(dmg => Date.now() - dmg.time < 2000)
    );
  });

  // Dynamic material properties based on health and state
  const zombieColor = useMemo(() => {
    const healthRatio = zombie.health / zombie.maxHealth;
    
    if (zombie.animationState === 'dying' || zombie.animationState === 'dead') {
      return new THREE.Color(0.15, 0.1, 0.1); // Decaying flesh
    }
    
    if (zombie.isTargeted) {
      // Pulsing red highlight for targeted zombie
      const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
      return new THREE.Color(pulse * 0.8, 0.1, 0.1);
    }
    
    // Health-based coloring with realistic flesh tones
    const baseHue = 0.1; // Sickly yellow-green base
    const saturation = 0.6 + (1 - healthRatio) * 0.4;
    const lightness = 0.2 + healthRatio * 0.3;
    
    return new THREE.Color().setHSL(baseHue, saturation, lightness);
  }, [zombie.health, zombie.maxHealth, zombie.animationState, zombie.isTargeted]);

  return (
    <group ref={groupRef}>
      {/* Enhanced procedural zombie model */}
      <group ref={modelRef} scale={2.8}>
        <ZombieArmsAnimation 
          zombieRef={groupRef}
          walkSpeed={walkSpeed}
          isWalking={zombie.animationState === 'walking'}
        />
      </group>
      
      {/* Advanced particle effects when hit */}
      {zombie.hitEffect && Date.now() - zombie.hitEffect.time < 1500 && (
        <ParticleSystem
          position={zombie.hitEffect.position}
          type={zombie.hitEffect.type}
          intensity={2.5}
        />
      )}
      
      {/* Cinematic blood splatter effects */}
      {bloodSplatterActive && (
        <>
          {/* Primary blood explosion */}
          <mesh position={zombie.position}>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshBasicMaterial 
              color="#8B0000" 
              transparent 
              opacity={0.8}
            />
          </mesh>
          
          {/* Blood spray particles */}
          {Array.from({ length: 8 }).map((_, i) => (
            <mesh 
              key={i}
              position={[
                zombie.position.x + (Math.random() - 0.5) * 2,
                zombie.position.y + Math.random() * 1.5,
                zombie.position.z + (Math.random() - 0.5) * 2
              ]}
            >
              <sphereGeometry args={[0.05 + Math.random() * 0.1, 6, 6]} />
              <meshBasicMaterial 
                color={new THREE.Color().setHSL(0, 0.9, 0.2 + Math.random() * 0.3)} 
                transparent 
                opacity={0.7}
              />
            </mesh>
          ))}
        </>
      )}

      {/* Massive explosion effect for high-damage weapons */}
      {explosionActive && zombie.hitEffect?.type === 'rocket' && (
        <>
          <mesh position={zombie.position}>
            <sphereGeometry args={[1.5, 32, 32]} />
            <meshBasicMaterial 
              color="#FF4500" 
              transparent 
              opacity={0.6}
            />
          </mesh>
          
          {/* Shockwave effect */}
          <mesh position={zombie.position}>
            <ringGeometry args={[1, 3, 16]} />
            <meshBasicMaterial 
              color="#FFAA00" 
              transparent 
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}
      
      {/* Nuclear annihilation effect */}
      {explosionActive && zombie.hitEffect?.type === 'nuke' && (
        <>
          <mesh position={zombie.position}>
            <sphereGeometry args={[5, 64, 64]} />
            <meshBasicMaterial 
              color="#FFFFFF" 
              transparent 
              opacity={0.9}
            />
          </mesh>
          
          {/* Atomic flash */}
          <mesh position={zombie.position}>
            <sphereGeometry args={[8, 32, 32]} />
            <meshBasicMaterial 
              color="#00FFFF" 
              transparent 
              opacity={0.4}
            />
          </mesh>
        </>
      )}
      
      {/* Floating damage numbers */}
      {damageNumbers.map((dmg) => (
        <mesh 
          key={dmg.id}
          position={[
            dmg.position.x,
            dmg.position.y + (Date.now() - dmg.time) * 0.001,
            dmg.position.z
          ]}
        >
          <planeGeometry args={[0.5, 0.3]} />
          <meshBasicMaterial 
            color="#FF0000" 
            transparent 
            opacity={Math.max(0, 1 - (Date.now() - dmg.time) / 2000)}
          />
        </mesh>
      ))}
      
      {/* Enhanced word prompt with targeting laser */}
      <WordPrompt
        word={zombie.targetWord}
        position={zombie.position}
        isTargeted={zombie.isTargeted}
        currentIndex={zombie.isTargeted ? currentIndex : 0}
        isCompleted={zombie.animationState === 'dead'}
      />
      
      {/* Targeting laser beam for selected zombie */}
      {zombie.isTargeted && (
        <mesh position={[0, 1, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 15]} />
          <meshBasicMaterial 
            color="#FF0000" 
            transparent 
            opacity={0.6}
            emissive="#FF0000"
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
    </group>
  );
}
