import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useZombieGame } from "../lib/stores/useZombieGame";
import { MuzzleFlash } from "./MuzzleFlash";

export function WeaponDisplay() {
  const { currentWeapon } = useZombieGame();
  
  if (!currentWeapon) return null;
  const weaponRef = useRef<THREE.Group>(null);
  const [recoilTime, setRecoilTime] = useState(0);
  const [showMuzzleFlash, setShowMuzzleFlash] = useState(false);

  // Create weapon geometry based on type
  const weaponGeometry = useMemo(() => {
    switch (currentWeapon.name) {
      case 'pistol':
        return {
          barrel: [0.05, 0.4, 0.05] as [number, number, number],
          grip: [0.08, 0.2, 0.08] as [number, number, number],
          color: "#2C2C2C",
          muzzleFlash: false
        };
      case 'shotgun':
        return {
          barrel: [0.08, 0.6, 0.08] as [number, number, number],
          grip: [0.1, 0.25, 0.1] as [number, number, number],
          color: "#1A1A1A",
          muzzleFlash: false
        };
      case 'flamethrower':
        return {
          barrel: [0.12, 0.5, 0.12] as [number, number, number],
          grip: [0.15, 0.3, 0.15] as [number, number, number],
          color: "#8B4513",
          muzzleFlash: true
        };
      case 'rocket':
        return {
          barrel: [0.15, 0.8, 0.15] as [number, number, number],
          grip: [0.2, 0.4, 0.2] as [number, number, number],
          color: "#4A4A4A",
          muzzleFlash: false
        };
      case 'nuke':
        return {
          barrel: [0.2, 1.0, 0.2] as [number, number, number],
          grip: [0.25, 0.5, 0.25] as [number, number, number],
          color: "#006400",
          muzzleFlash: true
        };
      default:
        return {
          barrel: [0.05, 0.4, 0.05] as [number, number, number],
          grip: [0.08, 0.2, 0.08] as [number, number, number],
          color: "#2C2C2C",
          muzzleFlash: false
        };
    }
  }, [currentWeapon.name]);

  // Professional weapon sway and recoil animation
  useFrame((state, delta) => {
    if (!weaponRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Realistic breathing sway for ultimate realism
    weaponRef.current.rotation.z = Math.sin(time * 1.2) * 0.015;
    weaponRef.current.rotation.x = Math.sin(time * 0.8) * 0.008;
    weaponRef.current.position.y = -2.8 + Math.sin(time * 2.5) * 0.005;
    
    // Weapon-specific recoil when firing
    if (recoilTime > 0) {
      const recoilProgress = 1 - (recoilTime / 0.3);
      const recoilPower = currentWeapon.damage * 0.001;
      
      weaponRef.current.rotation.x += Math.sin(recoilProgress * Math.PI) * recoilPower;
      weaponRef.current.position.z -= Math.sin(recoilProgress * Math.PI) * recoilPower * 2;
      
      setRecoilTime(prev => Math.max(0, prev - delta));
    }
  });

  // Trigger recoil and muzzle flash on weapon fire
  const triggerWeaponFire = () => {
    setRecoilTime(0.3);
    setShowMuzzleFlash(true);
  };

  // Global weapon fire trigger (called from typing system)
  useEffect(() => {
    (window as any).triggerWeaponFire = triggerWeaponFire;
    return () => {
      delete (window as any).triggerWeaponFire;
    };
  }, []);

  return (
    <group 
      ref={weaponRef} 
      position={[1.2, -2.8, -0.5]} 
      rotation={[0.1, -0.2, 0]}
    >
      {/* Weapon Barrel */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={weaponGeometry.barrel} />
        <meshLambertMaterial color={weaponGeometry.color} />
      </mesh>
      
      {/* Weapon Grip */}
      <mesh position={[0, -0.1, 0]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={weaponGeometry.grip} />
        <meshLambertMaterial color={weaponGeometry.color} />
      </mesh>
      
      {/* Weapon Details */}
      <mesh position={[0, 0.1, 0.03]}>
        <boxGeometry args={[0.02, 0.15, 0.02]} />
        <meshLambertMaterial color="#666666" />
      </mesh>
      
      {/* Scope for advanced weapons */}
      {(currentWeapon.name === 'rocket' || currentWeapon.name === 'nuke') && (
        <mesh position={[0, 0.4, 0.05]}>
          <cylinderGeometry args={[0.03, 0.03, 0.15]} />
          <meshLambertMaterial color="#333333" />
        </mesh>
      )}
      
      {/* Professional muzzle flash effect */}
      {showMuzzleFlash && (
        <MuzzleFlash 
          position={new THREE.Vector3(0, weaponGeometry.barrel[1]/2 + 0.15, 0)}
          weaponType={currentWeapon.name as 'pistol' | 'shotgun' | 'flamethrower' | 'rocket' | 'nuke'}
          intensity={1.5}
          onComplete={() => setShowMuzzleFlash(false)}
        />
      )}
      
      {/* Muzzle flash effect for flame weapons */}
      {weaponGeometry.muzzleFlash && (
        <mesh position={[0, weaponGeometry.barrel[1]/2 + 0.1, 0]}>
          <coneGeometry args={[0.08, 0.2, 8]} />
          <meshBasicMaterial 
            color="#FF4500" 
            transparent 
            opacity={0.6}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}