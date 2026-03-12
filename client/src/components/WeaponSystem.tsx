import React, { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useZombieGame } from "../lib/stores/useZombieGame";
import { ParticleSystem } from "./ParticleSystem";
import * as THREE from "three";

export function WeaponSystem() {
  const { currentWeapon, lastShot, zombies } = useZombieGame();
  const muzzleFlashRef = useRef<THREE.Mesh>(null);
  const weaponRef = useRef<THREE.Group>(null);
  const shellEjectionRef = useRef<THREE.Group>(null);
  const laserSightRef = useRef<THREE.Mesh>(null);
  
  const [bulletTrails, setBulletTrails] = useState<Array<{
    id: string;
    start: THREE.Vector3;
    end: THREE.Vector3;
    time: number;
    type: string;
  }>>([]);
  
  const [shellCasings, setShellCasings] = useState<Array<{
    id: string;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    rotation: THREE.Euler;
    time: number;
    type: string;
  }>>([]);

  // Advanced weapon physics and visual effects
  useFrame((state) => {
    const now = state.clock.elapsedTime * 1000;
    
    // Realistic weapon recoil with spring physics
    if (weaponRef.current && lastShot) {
      const timeSinceShot = now - lastShot;
      const recoilDuration = getWeaponRecoilDuration(currentWeapon);
      
      if (timeSinceShot < recoilDuration) {
        const recoilIntensity = getWeaponRecoil(currentWeapon);
        const recoilProgress = timeSinceShot / recoilDuration;
        
        // Spring-damped recoil animation
        const springValue = Math.exp(-recoilProgress * 8) * Math.sin(recoilProgress * 20);
        const recoilAmount = springValue * recoilIntensity;
        
        // Multi-axis recoil for realism
        weaponRef.current.rotation.x = -recoilAmount * 0.4; // Muzzle climb
        weaponRef.current.rotation.y = (Math.random() - 0.5) * recoilAmount * 0.2; // Horizontal kick
        weaponRef.current.position.z = recoilAmount * 0.8; // Backward thrust
        weaponRef.current.position.y = -recoilAmount * 0.2; // Slight drop
        
        // Weapon shake intensity based on caliber
        const shakeIntensity = recoilAmount * 0.1;
        weaponRef.current.position.x += (Math.random() - 0.5) * shakeIntensity;
      } else {
        // Return to rest position with smoothing
        weaponRef.current.rotation.x = THREE.MathUtils.lerp(weaponRef.current.rotation.x, 0, 0.1);
        weaponRef.current.rotation.y = THREE.MathUtils.lerp(weaponRef.current.rotation.y, 0, 0.1);
        weaponRef.current.position.z = THREE.MathUtils.lerp(weaponRef.current.position.z, 0, 0.1);
        weaponRef.current.position.y = THREE.MathUtils.lerp(weaponRef.current.position.y, 0, 0.1);
        weaponRef.current.position.x = THREE.MathUtils.lerp(weaponRef.current.position.x, 0, 0.1);
      }
    }
    
    // Advanced muzzle flash with weapon-specific characteristics
    if (muzzleFlashRef.current && lastShot) {
      const timeSinceShot = now - lastShot;
      const flashDuration = getWeaponFlashDuration(currentWeapon);
      
      if (timeSinceShot < flashDuration) {
        muzzleFlashRef.current.visible = true;
        const flashProgress = timeSinceShot / flashDuration;
        const flashIntensity = (1 - flashProgress) * getWeaponFlashIntensity(currentWeapon);
        
        // Dynamic flash scaling with realistic shape
        const baseSize = getWeaponFlashSize(currentWeapon);
        const flickerScale = 0.8 + Math.sin(timeSinceShot * 0.1) * 0.4;
        muzzleFlashRef.current.scale.set(
          baseSize * flickerScale,
          baseSize * 0.3,
          baseSize * 1.5
        );
        
        // Color temperature changes over flash duration
        const material = muzzleFlashRef.current.material as THREE.MeshBasicMaterial;
        const flashColor = getWeaponFlashColor(currentWeapon, flashProgress);
        material.color.setHex(flashColor);
        material.opacity = flashIntensity;
        
        // Remove emissive properties - MeshBasicMaterial doesn't support them
      } else {
        muzzleFlashRef.current.visible = false;
      }
    }
    
    // Shell casing ejection system
    if (lastShot && now - lastShot < 50 && !shellCasings.find(shell => now - shell.time < 100)) {
      ejectShellCasing(currentWeapon, now);
    }
    
    // Update shell casing physics
    setShellCasings(casings => 
      casings.map(casing => {
        const age = (now - casing.time) / 1000;
        
        // Ballistic trajectory with air resistance
        casing.velocity.y -= 9.8 * 0.016; // Gravity
        casing.velocity.multiplyScalar(0.99); // Air resistance
        
        // Update position
        casing.position.add(casing.velocity.clone().multiplyScalar(0.016));
        
        // Tumbling rotation
        casing.rotation.x += casing.velocity.length() * 0.01;
        casing.rotation.y += casing.velocity.length() * 0.008;
        casing.rotation.z += casing.velocity.length() * 0.006;
        
        // Ground collision
        if (casing.position.y < -1.8) {
          casing.position.y = -1.8;
          casing.velocity.y *= -0.3; // Bounce
          casing.velocity.x *= 0.8; // Friction
          casing.velocity.z *= 0.8;
        }
        
        return casing;
      }).filter(casing => now - casing.time < 10000) // Remove old casings
    );
    
    // Laser sight targeting system
    if (laserSightRef.current && currentWeapon !== 'nuke') {
      const targetedZombie = zombies.find(z => z.isTargeted);
      if (targetedZombie) {
        // Dynamic laser sight with atmospheric scattering
        const distance = targetedZombie.position.distanceTo(new THREE.Vector3(0.8, 0.5, 7.5));
        laserSightRef.current.scale.z = distance;
        laserSightRef.current.lookAt(targetedZombie.position);
        
        // Laser intensity based on range
        const material = laserSightRef.current.material as THREE.MeshBasicMaterial;
        material.opacity = Math.max(0.3, 1 - distance * 0.02);
      }
    }
    
    // Clean up old bullet trails
    setBulletTrails(trails => 
      trails.filter(trail => now - trail.time < getTrailDuration(trail.type))
    );
  });

  // Shell casing ejection function
  const ejectShellCasing = (weaponType: string, time: number) => {
    const ejectionData = getShellEjectionData(weaponType);
    if (!ejectionData) return;
    
    const newCasing = {
      id: Date.now().toString() + Math.random(),
      position: new THREE.Vector3(1.2, 0.7, 7.3), // Ejection port position
      velocity: new THREE.Vector3(
        2 + Math.random() * 2, // Rightward ejection
        1 + Math.random() * 1.5, // Upward arc
        -0.5 + Math.random() * 1 // Slight backward
      ),
      rotation: new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      ),
      time: time,
      type: weaponType
    };
    
    setShellCasings(prev => [...prev, newCasing]);
  };

  // Dynamic bullet trail generation
  const targetedZombie = zombies.find(z => z.isTargeted);
  const shouldShowBulletTrail = lastShot && targetedZombie && (Date.now() - lastShot < getTrailDuration(currentWeapon));

  return (
    <group ref={weaponRef} position={[0.8, 0.5, 7.5]}>
      {/* Photorealistic weapon model with dynamic details */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, -0.1]} castShadow>
        <boxGeometry args={getWeaponSize(currentWeapon)} />
        <meshStandardMaterial 
          color={getWeaponColor(currentWeapon)}
          metalness={0.9}
          roughness={0.1}
          emissive={getWeaponEmissive(currentWeapon)}
          emissiveIntensity={0.2}
          normalScale={new THREE.Vector2(1.5, 1.5)}
          envMapIntensity={1.5}
        />
      </mesh>
      
      {/* Advanced weapon details and attachments */}
      <WeaponDetails weaponType={currentWeapon} />
      
      {/* Tactical laser sight */}
      <mesh ref={laserSightRef} position={[0, -0.1, -0.4]} visible={currentWeapon !== 'nuke'}>
        <cylinderGeometry args={[0.002, 0.002, 10]} />
        <meshBasicMaterial 
          color="#ff0000" 
          transparent 
          opacity={0.7}
        />
      </mesh>
      
      {/* Realistic muzzle flash with weapon-specific geometry */}
      <group position={[0, 0, -getWeaponSize(currentWeapon)[2] / 2 - 0.1]}>
        <mesh ref={muzzleFlashRef} visible={false}>
          <sphereGeometry args={[0.15, 16, 12]} />
          <meshBasicMaterial 
            color="#ffffff" 
            transparent 
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
        
        {/* Muzzle flash cone for directional weapons */}
        {(currentWeapon === 'shotgun' || currentWeapon === 'flamethrower') && (
          <mesh visible={lastShot && Date.now() - lastShot < 100}>
            <coneGeometry args={[0.3, 0.8, 8]} />
            <meshBasicMaterial 
              color={getWeaponFlashColor(currentWeapon, 0.5)}
              transparent 
              opacity={0.6}
            />
          </mesh>
        )}
      </group>
      
      {/* Advanced particle systems for each weapon type */}
      {lastShot && Date.now() - lastShot < getEffectDuration(currentWeapon) && (
        <>
          <ParticleSystem
            position={new THREE.Vector3(0, 0, -getWeaponSize(currentWeapon)[2] / 2 - 0.1)}
            type={currentWeapon as any}
            intensity={getWeaponIntensity(currentWeapon)}
          />
          
          {/* Additional smoke effects */}
          <ParticleSystem
            position={new THREE.Vector3(0, 0, -getWeaponSize(currentWeapon)[2] / 2)}
            type="smoke"
            intensity={1}
          />
          
          {/* Sparks for metal impact simulation */}
          <ParticleSystem
            position={new THREE.Vector3(0.1, -0.05, -getWeaponSize(currentWeapon)[2] / 2)}
            type="sparks"
            intensity={0.5}
          />
        </>
      )}
      
      {/* Realistic bullet trails with physics */}
      {shouldShowBulletTrail && targetedZombie && (
        <BulletTrail
          start={new THREE.Vector3(0, 0, -getWeaponSize(currentWeapon)[2] / 2)}
          end={targetedZombie.position.clone().sub(new THREE.Vector3(0.8, 0.5, 7.5))}
          weaponType={currentWeapon}
        />
      )}
      
      {/* Shell casings with realistic physics */}
      <group ref={shellEjectionRef}>
        {shellCasings.map((casing) => (
          <ShellCasing key={casing.id} casing={casing} />
        ))}
      </group>
      
      {/* Weapon-specific special effects */}
      <WeaponSpecialEffects weaponType={currentWeapon} lastShot={lastShot} />
    </group>
  );
}

// Weapon detail components for modular design
function WeaponDetails({ weaponType }: { weaponType: string }) {
  return (
    <group>
      {/* Weapon barrel */}
      <mesh position={[0, 0, -getWeaponSize(weaponType)[2] / 2]}>
        <cylinderGeometry args={[0.03, 0.04, getWeaponSize(weaponType)[2], 12]} />
        <meshStandardMaterial 
          color="#1a1a1a" 
          metalness={0.95} 
          roughness={0.05}
        />
      </mesh>
      
      {/* Weapon sights */}
      <mesh position={[0, getWeaponSize(weaponType)[1] / 2 + 0.05, 0.2]}>
        <boxGeometry args={[0.02, 0.08, 0.1]} />
        <meshStandardMaterial color="#333333" metalness={0.8} />
      </mesh>
      
      {/* Trigger guard */}
      <mesh position={[0, -getWeaponSize(weaponType)[1] / 2, 0.2]}>
        <torusGeometry args={[0.08, 0.02, 6, 12]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.9} />
      </mesh>
      
      {/* Weapon-specific attachments */}
      {weaponType === 'shotgun' && (
        <mesh position={[0, -0.1, -0.2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.3, 8]} />
          <meshStandardMaterial color="#8B4513" roughness={0.8} />
        </mesh>
      )}
      
      {weaponType === 'flamethrower' && (
        <>
          <mesh position={[0.15, 0, 0.3]}>
            <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
            <meshStandardMaterial color="#ff4444" emissive="#442200" />
          </mesh>
          <mesh position={[-0.15, 0, 0.3]}>
            <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
            <meshStandardMaterial color="#ff4444" emissive="#442200" />
          </mesh>
        </>
      )}
      
      {weaponType === 'rocket' && (
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.8, 8]} />
          <meshStandardMaterial color="#556B2F" metalness={0.7} />
        </mesh>
      )}
      
      {weaponType === 'nuke' && (
        <>
          <mesh position={[0, 0, 0.5]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial 
              color="#ffff00" 
              emissive="#ffff00"
              emissiveIntensity={0.5}
            />
          </mesh>
          <mesh position={[0, 0, 0.3]}>
            <cylinderGeometry args={[0.15, 0.15, 0.4, 16]} />
            <meshStandardMaterial 
              color="#2a2a2a" 
              metalness={0.9}
              emissive="#ffff00"
              emissiveIntensity={0.2}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

// Bullet trail component with realistic ballistics
function BulletTrail({ start, end, weaponType }: { start: THREE.Vector3; end: THREE.Vector3; weaponType: string }) {
  const lineRef = useRef<THREE.Line>(null);
  
  useFrame(() => {
    if (lineRef.current) {
      // Animate bullet travel with realistic ballistics
      const material = lineRef.current.material as THREE.LineBasicMaterial;
      material.opacity = Math.max(0, material.opacity - 0.05);
    }
  });
  
  const points = [start, end];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  
  return (
    <line ref={lineRef} geometry={geometry}>
      <lineBasicMaterial 
        color={getBulletTrailColor(weaponType)} 
        transparent 
        opacity={0.8}
        linewidth={getBulletTrailWidth(weaponType)}
      />
    </line>
  );
}

// Shell casing component with physics
function ShellCasing({ casing }: { casing: any }) {
  return (
    <mesh position={casing.position} rotation={casing.rotation}>
      <cylinderGeometry args={getShellDimensions(casing.type)} />
      <meshStandardMaterial 
        color="#DAA520" 
        metalness={0.8} 
        roughness={0.2}
      />
    </mesh>
  );
}

// Weapon special effects component
function WeaponSpecialEffects({ weaponType, lastShot }: { weaponType: string; lastShot: number | null }) {
  if (!lastShot || Date.now() - lastShot > 1000) return null;
  
  switch (weaponType) {
    case 'flamethrower':
      return (
        <mesh position={[0, 0, -1.5]} rotation={[-Math.PI/2, 0, 0]}>
          <coneGeometry args={[0.8, 4, 8]} />
          <meshBasicMaterial 
            color="#ff4400" 
            transparent 
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      );
      
    case 'rocket':
      return (
        <group>
          <mesh position={[0, 0, -2]}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial 
              color="#ff6600" 
              transparent 
              opacity={0.3}
            />
          </mesh>
          <mesh position={[0, 0, -2]}>
            <ringGeometry args={[0.8, 2, 16]} />
            <meshBasicMaterial 
              color="#ffaa00" 
              transparent 
              opacity={0.5}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      );
      
    case 'nuke':
      return (
        <group>
          <mesh position={[0, 0, -5]}>
            <sphereGeometry args={[8, 32, 32]} />
            <meshBasicMaterial 
              color="#ffffff" 
              transparent 
              opacity={0.1}
            />
          </mesh>
          <mesh position={[0, 0, -5]}>
            <sphereGeometry args={[12, 32, 32]} />
            <meshBasicMaterial 
              color="#00ffff" 
              transparent 
              opacity={0.05}
            />
          </mesh>
        </group>
      );
      
    default:
      return null;
  }
}

// Enhanced weapon configuration functions
function getWeaponSize(weapon: string): [number, number, number] {
  switch (weapon) {
    case 'pistol': return [0.12, 0.25, 1.0];
    case 'shotgun': return [0.18, 0.3, 1.4];
    case 'flamethrower': return [0.25, 0.35, 1.2];
    case 'rocket': return [0.3, 0.45, 1.8];
    case 'nuke': return [0.4, 0.6, 2.5];
    default: return [0.12, 0.25, 1.0];
  }
}

function getWeaponColor(weapon: string): string {
  switch (weapon) {
    case 'pistol': return '#4a4a4a';
    case 'shotgun': return '#2a2a2a';
    case 'flamethrower': return '#ff6644';
    case 'rocket': return '#556B2F';
    case 'nuke': return '#ffdd44';
    default: return '#4a4a4a';
  }
}

function getWeaponEmissive(weapon: string): string {
  switch (weapon) {
    case 'flamethrower': return '#ff3300';
    case 'rocket': return '#004400';
    case 'nuke': return '#ffff00';
    default: return '#000000';
  }
}

function getWeaponRecoil(weapon: string): number {
  switch (weapon) {
    case 'pistol': return 0.15;
    case 'shotgun': return 0.4;
    case 'flamethrower': return 0.08;
    case 'rocket': return 1.2;
    case 'nuke': return 2.0;
    default: return 0.15;
  }
}

function getWeaponRecoilDuration(weapon: string): number {
  switch (weapon) {
    case 'pistol': return 200;
    case 'shotgun': return 400;
    case 'flamethrower': return 100;
    case 'rocket': return 800;
    case 'nuke': return 1500;
    default: return 200;
  }
}

function getWeaponFlashSize(weapon: string): number {
  switch (weapon) {
    case 'pistol': return 1.2;
    case 'shotgun': return 2.0;
    case 'flamethrower': return 2.8;
    case 'rocket': return 4.0;
    case 'nuke': return 8.0;
    default: return 1.2;
  }
}

function getWeaponFlashDuration(weapon: string): number {
  switch (weapon) {
    case 'pistol': return 80;
    case 'shotgun': return 120;
    case 'flamethrower': return 200;
    case 'rocket': return 300;
    case 'nuke': return 1000;
    default: return 80;
  }
}

function getWeaponFlashIntensity(weapon: string): number {
  switch (weapon) {
    case 'pistol': return 1.0;
    case 'shotgun': return 1.5;
    case 'flamethrower': return 2.0;
    case 'rocket': return 3.0;
    case 'nuke': return 5.0;
    default: return 1.0;
  }
}

function getWeaponFlashColor(weapon: string, progress: number): number {
  const t = 1 - progress; // Intensity decreases over time
  
  switch (weapon) {
    case 'pistol': 
      return THREE.Color.NAMES.yellow;
    case 'shotgun': 
      return new THREE.Color().lerpColors(
        new THREE.Color(0xffffff), 
        new THREE.Color(0xff8800), 
        progress
      ).getHex();
    case 'flamethrower': 
      return new THREE.Color().lerpColors(
        new THREE.Color(0xffffff), 
        new THREE.Color(0xff2200), 
        progress
      ).getHex();
    case 'rocket': 
      return new THREE.Color().lerpColors(
        new THREE.Color(0xffffff), 
        new THREE.Color(0xff0000), 
        progress
      ).getHex();
    case 'nuke': 
      return new THREE.Color().lerpColors(
        new THREE.Color(0xffffff), 
        new THREE.Color(0x00ffff), 
        progress * 0.3
      ).getHex();
    default: 
      return 0xffff44;
  }
}

function getBulletTrailColor(weapon: string): string {
  switch (weapon) {
    case 'pistol': return '#ffff88';
    case 'shotgun': return '#ff8844';
    case 'flamethrower': return '#ff4422';
    case 'rocket': return '#ff0000';
    case 'nuke': return '#ffffff';
    default: return '#ffff88';
  }
}

function getBulletTrailWidth(weapon: string): number {
  switch (weapon) {
    case 'pistol': return 2;
    case 'shotgun': return 4;
    case 'flamethrower': return 6;
    case 'rocket': return 8;
    case 'nuke': return 12;
    default: return 2;
  }
}

function getTrailDuration(weapon: string): number {
  switch (weapon) {
    case 'pistol': return 100;
    case 'shotgun': return 150;
    case 'flamethrower': return 300;
    case 'rocket': return 500;
    case 'nuke': return 1000;
    default: return 100;
  }
}

function getEffectDuration(weapon: string): number {
  switch (weapon) {
    case 'pistol': return 200;
    case 'shotgun': return 300;
    case 'flamethrower': return 500;
    case 'rocket': return 800;
    case 'nuke': return 2000;
    default: return 200;
  }
}

function getWeaponIntensity(weapon: string): number {
  switch (weapon) {
    case 'pistol': return 1;
    case 'shotgun': return 2;
    case 'flamethrower': return 3;
    case 'rocket': return 4;
    case 'nuke': return 8;
    default: return 1;
  }
}

function getShellEjectionData(weapon: string) {
  switch (weapon) {
    case 'pistol': 
    case 'shotgun':
      return { size: [0.02, 0.04], material: 'brass' };
    case 'rocket':
      return null; // No shell ejection
    case 'flamethrower':
    case 'nuke':
      return null; // No conventional shells
    default: 
      return { size: [0.02, 0.04], material: 'brass' };
  }
}

function getShellDimensions(weapon: string): [number, number, number] {
  switch (weapon) {
    case 'pistol': return [0.015, 0.04, 8];
    case 'shotgun': return [0.025, 0.06, 8];
    default: return [0.015, 0.04, 8];
  }
}
