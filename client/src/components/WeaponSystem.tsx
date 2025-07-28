import { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useZombieGame } from "../lib/stores/useZombieGame";
import { ParticleSystem } from "./ParticleSystem";
import * as THREE from "three";

export function WeaponSystem() {
  const { currentWeapon, lastShot, zombies } = useZombieGame();
  const muzzleFlashRef = useRef<THREE.Mesh>(null);
  const weaponRef = useRef<THREE.Group>(null);
  const [bulletTrails, setBulletTrails] = useState<Array<{
    id: string;
    start: THREE.Vector3;
    end: THREE.Vector3;
    time: number;
    type: string;
  }>>([]);

  // Advanced weapon animations and effects
  useFrame((state) => {
    const now = state.clock.elapsedTime * 1000;
    
    // Weapon recoil animation
    if (weaponRef.current && lastShot) {
      const timeSinceShot = now - lastShot;
      if (timeSinceShot < 200) {
        const recoilIntensity = getWeaponRecoil(currentWeapon);
        const recoilProgress = timeSinceShot / 200;
        const recoil = Math.sin(recoilProgress * Math.PI) * recoilIntensity;
        
        weaponRef.current.rotation.x = -recoil * 0.3;
        weaponRef.current.position.z = recoil * 0.5;
      } else {
        weaponRef.current.rotation.x = 0;
        weaponRef.current.position.z = 0;
      }
    }
    
    // Muzzle flash with weapon-specific effects
    if (muzzleFlashRef.current && lastShot) {
      const timeSinceShot = now - lastShot;
      if (timeSinceShot < 100) {
        muzzleFlashRef.current.visible = true;
        const flashIntensity = (100 - timeSinceShot) / 100;
        muzzleFlashRef.current.scale.setScalar(flashIntensity * getWeaponFlashSize(currentWeapon));
        
        // Different colors for different weapons
        const material = muzzleFlashRef.current.material as THREE.MeshBasicMaterial;
        material.color.setHex(getWeaponFlashColor(currentWeapon));
      } else {
        muzzleFlashRef.current.visible = false;
      }
    }
    
    // Clean up old bullet trails
    setBulletTrails(trails => 
      trails.filter(trail => now - trail.time < 500)
    );
  });

  // Create bullet trail when shooting
  const targetedZombie = zombies.find(z => z.isTargeted);
  const shouldShowBulletTrail = lastShot && targetedZombie && (Date.now() - lastShot < 100);

  return (
    <group ref={weaponRef} position={[0.8, 0.5, 7.5]}>
      {/* Advanced weapon model */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, -0.1]} castShadow>
        <boxGeometry args={getWeaponSize(currentWeapon)} />
        <meshStandardMaterial 
          color={getWeaponColor(currentWeapon)}
          metalness={0.8}
          roughness={0.2}
          emissive={getWeaponEmissive(currentWeapon)}
          emissiveIntensity={0.3}
        />
        
        {/* Weapon details */}
        <mesh position={[0, 0, -0.1]}>
          <boxGeometry args={[0.05, 0.05, 0.3]} />
          <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.1} />
        </mesh>
      </mesh>
      
      {/* Weapon scope/sight */}
      <mesh position={[0, 0.15, 0.2]}>
        <boxGeometry args={[0.03, 0.1, 0.4]} />
        <meshStandardMaterial color="#222222" metalness={0.7} />
      </mesh>
      
      {/* Advanced muzzle flash with particles */}
      <mesh ref={muzzleFlashRef} position={[0, 0, -0.8]} visible={false}>
        <sphereGeometry args={[0.2, 16, 12]} />
        <meshBasicMaterial 
          color="#ffffff" 
          transparent 
          opacity={0.9}
        />
      </mesh>
      
      {/* Particle system for muzzle flash */}
      {lastShot && Date.now() - lastShot < 200 && (
        <ParticleSystem
          position={new THREE.Vector3(0, 0, -0.8)}
          type={currentWeapon as any}
          intensity={2}
        />
      )}
      
      {/* Bullet trail visualization */}
      {shouldShowBulletTrail && targetedZombie && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                0, 0, -0.8, // Weapon muzzle
                targetedZombie.position.x - 0.8, 
                targetedZombie.position.y + 1, 
                targetedZombie.position.z - 7.5 // Target position
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial 
            color={getBulletTrailColor(currentWeapon)} 
            transparent 
            opacity={0.8}
            linewidth={3}
          />
        </line>
      )}
      
      {/* Weapon-specific special effects */}
      {currentWeapon === 'flamethrower' && lastShot && Date.now() - lastShot < 300 && (
        <mesh position={[0, 0, -2]} rotation={[-Math.PI/2, 0, 0]}>
          <coneGeometry args={[0.5, 3, 8]} />
          <meshBasicMaterial 
            color="#ff4400" 
            transparent 
            opacity={0.6}
          />
        </mesh>
      )}
    </group>
  );
}

function getWeaponSize(weapon: string): [number, number, number] {
  switch (weapon) {
    case 'pistol': return [0.1, 0.2, 0.8];
    case 'shotgun': return [0.15, 0.25, 1.2];
    case 'flamethrower': return [0.2, 0.3, 1.0];
    case 'rocket': return [0.25, 0.4, 1.5];
    case 'nuke': return [0.3, 0.5, 2.0];
    default: return [0.1, 0.2, 0.8];
  }
}

function getWeaponColor(weapon: string): string {
  switch (weapon) {
    case 'pistol': return '#666666';
    case 'shotgun': return '#444444';
    case 'flamethrower': return '#ff4444';
    case 'rocket': return '#44ff44';
    case 'nuke': return '#ffff44';
    default: return '#666666';
  }
}

function getWeaponEmissive(weapon: string): string {
  switch (weapon) {
    case 'pistol': return '#000000';
    case 'shotgun': return '#000000';
    case 'flamethrower': return '#ff2200';
    case 'rocket': return '#00ff22';
    case 'nuke': return '#ffff00';
    default: return '#000000';
  }
}

function getWeaponRecoil(weapon: string): number {
  switch (weapon) {
    case 'pistol': return 0.1;
    case 'shotgun': return 0.3;
    case 'flamethrower': return 0.05;
    case 'rocket': return 0.8;
    case 'nuke': return 1.5;
    default: return 0.1;
  }
}

function getWeaponFlashSize(weapon: string): number {
  switch (weapon) {
    case 'pistol': return 1;
    case 'shotgun': return 1.5;
    case 'flamethrower': return 2;
    case 'rocket': return 3;
    case 'nuke': return 5;
    default: return 1;
  }
}

function getWeaponFlashColor(weapon: string): number {
  switch (weapon) {
    case 'pistol': return 0xffff44;
    case 'shotgun': return 0xff8844;
    case 'flamethrower': return 0xff4444;
    case 'rocket': return 0xff0000;
    case 'nuke': return 0xffffff;
    default: return 0xffff44;
  }
}

function getBulletTrailColor(weapon: string): string {
  switch (weapon) {
    case 'pistol': return '#ffff00';
    case 'shotgun': return '#ff8800';
    case 'flamethrower': return '#ff4400';
    case 'rocket': return '#ff0000';
    case 'nuke': return '#ffffff';
    default: return '#ffff00';
  }
}
