import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, Group } from "three";
import * as THREE from "three";
import { ParticleSystem } from "./ParticleSystem";
import { WordPrompt } from "./WordPrompt";

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
  const bodyRef = useRef<Mesh>(null);
  const leftArmRef = useRef<Mesh>(null);
  const rightArmRef = useRef<Mesh>(null);
  const leftLegRef = useRef<Mesh>(null);
  const rightLegRef = useRef<Mesh>(null);
  const weaponRef = useRef<Mesh>(null);
  
  const [animationTime, setAnimationTime] = useState(0);

  // Advanced animation system
  useFrame((state, delta) => {
    setAnimationTime(prev => prev + delta);
    
    if (groupRef.current) {
      const time = state.clock.elapsedTime + zombie.id.length;
      
      // Position the entire zombie group
      groupRef.current.position.copy(zombie.position);
      
      // Realistic walking animation
      if (zombie.animationState === 'walking') {
        // Body bobbing
        if (bodyRef.current) {
          bodyRef.current.position.y = 0.1 + Math.sin(time * 8) * 0.05;
          bodyRef.current.rotation.x = Math.sin(time * 8) * 0.05;
        }
        
        // Arm swinging (realistic human-like movement)
        if (leftArmRef.current && rightArmRef.current) {
          leftArmRef.current.rotation.x = Math.sin(time * 8) * 0.6;
          rightArmRef.current.rotation.x = -Math.sin(time * 8) * 0.6;
          leftArmRef.current.rotation.z = 0.3 + Math.sin(time * 4) * 0.1;
          rightArmRef.current.rotation.z = -0.3 - Math.sin(time * 4) * 0.1;
        }
        
        // Leg movement (walking stride)
        if (leftLegRef.current && rightLegRef.current) {
          leftLegRef.current.rotation.x = Math.sin(time * 8) * 0.8;
          rightLegRef.current.rotation.x = -Math.sin(time * 8) * 0.8;
        }
      }
      
      // Aggressive attacking animation
      else if (zombie.animationState === 'attacking') {
        // Violent arm movements
        if (leftArmRef.current && rightArmRef.current) {
          leftArmRef.current.rotation.x = -1.2 + Math.sin(time * 15) * 0.8;
          rightArmRef.current.rotation.x = -1.2 + Math.sin(time * 15 + Math.PI) * 0.8;
          leftArmRef.current.rotation.z = 0.8;
          rightArmRef.current.rotation.z = -0.8;
        }
        
        // Body lurching forward aggressively
        if (bodyRef.current) {
          bodyRef.current.rotation.x = -0.3 + Math.sin(time * 12) * 0.2;
          bodyRef.current.position.y = Math.sin(time * 12) * 0.1;
        }
        
        // Weapon swinging
        if (weaponRef.current) {
          weaponRef.current.rotation.z = Math.sin(time * 15) * 1.5;
        }
      }
      
      // Death animation
      else if (zombie.animationState === 'dying') {
        const deathProgress = zombie.deathTime ? 
          Math.min(1, (Date.now() - zombie.deathTime) / 1000) : 0;
        
        if (bodyRef.current) {
          bodyRef.current.rotation.x = deathProgress * Math.PI * 0.5;
          bodyRef.current.position.y = -deathProgress * 1.5;
        }
        
        // Limbs falling
        if (leftArmRef.current) leftArmRef.current.rotation.z = deathProgress * 2;
        if (rightArmRef.current) rightArmRef.current.rotation.z = -deathProgress * 2;
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
    <group ref={groupRef} castShadow receiveShadow>
      
      {/* Advanced zombie body */}
      <mesh ref={bodyRef} position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.9, 2.2, 0.6]} />
        <meshLambertMaterial color={zombieColor} />
        
        {/* Detailed zombie head with more realistic features */}
        <mesh position={[0, 1.4, 0]} castShadow>
          <boxGeometry args={[0.7, 0.8, 0.7]} />
          <meshLambertMaterial color={zombieColor} />
          
          {/* Glowing red eyes */}
          <mesh position={[-0.2, 0.1, 0.35]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color="#ff0000" />
          </mesh>
          <mesh position={[0.2, 0.1, 0.35]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color="#ff0000" />
          </mesh>
          
          {/* Grotesque mouth */}
          <mesh position={[0, -0.2, 0.35]}>
            <boxGeometry args={[0.3, 0.1, 0.1]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
        </mesh>
      </mesh>
      
      {/* Articulated arms with realistic joints */}
      <mesh ref={leftArmRef} position={[-0.7, 0.5, 0]} castShadow>
        <boxGeometry args={[0.25, 1.2, 0.25]} />
        <meshLambertMaterial color={zombieColor} />
        
        {/* Hand/Claw */}
        <mesh position={[0, -0.8, 0]}>
          <boxGeometry args={[0.15, 0.3, 0.15]} />
          <meshLambertMaterial color={zombieColor.clone().multiplyScalar(0.8)} />
        </mesh>
      </mesh>
      
      <mesh ref={rightArmRef} position={[0.7, 0.5, 0]} castShadow>
        <boxGeometry args={[0.25, 1.2, 0.25]} />
        <meshLambertMaterial color={zombieColor} />
        
        {/* Zombie weapon - rusty knife */}
        <mesh ref={weaponRef} position={[0, -0.8, 0.2]} castShadow>
          <boxGeometry args={[0.05, 0.6, 0.02]} />
          <meshLambertMaterial color="#666666" />
        </mesh>
        
        {/* Hand holding weapon */}
        <mesh position={[0, -0.8, 0]}>
          <boxGeometry args={[0.15, 0.3, 0.15]} />
          <meshLambertMaterial color={zombieColor.clone().multiplyScalar(0.8)} />
        </mesh>
      </mesh>
      
      {/* Realistic legs with joints */}
      <mesh ref={leftLegRef} position={[-0.25, -1.5, 0]} castShadow>
        <boxGeometry args={[0.3, 1.2, 0.3]} />
        <meshLambertMaterial color={zombieColor} />
        
        {/* Foot */}
        <mesh position={[0, -0.8, 0.2]}>
          <boxGeometry args={[0.25, 0.15, 0.5]} />
          <meshLambertMaterial color={zombieColor.clone().multiplyScalar(0.7)} />
        </mesh>
      </mesh>
      
      <mesh ref={rightLegRef} position={[0.25, -1.5, 0]} castShadow>
        <boxGeometry args={[0.3, 1.2, 0.3]} />
        <meshLambertMaterial color={zombieColor} />
        
        {/* Foot */}
        <mesh position={[0, -0.8, 0.2]}>
          <boxGeometry args={[0.25, 0.15, 0.5]} />
          <meshLambertMaterial color={zombieColor.clone().multiplyScalar(0.7)} />
        </mesh>
      </mesh>
      
      {/* Particle effects when hit */}
      {zombie.hitEffect && Date.now() - zombie.hitEffect.time < 1000 && (
        <ParticleSystem
          position={zombie.hitEffect.position}
          type={zombie.hitEffect.type}
          intensity={1}
        />
      )}
      
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
        currentIndex={0} // We'll need to get this from the game state
        isCompleted={zombie.animationState === 'dead'}
      />
    </group>
  );
}
