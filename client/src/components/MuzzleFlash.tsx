import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface MuzzleFlashProps {
  position: THREE.Vector3;
  weaponType: 'pistol' | 'shotgun' | 'flamethrower' | 'rocket' | 'nuke';
  intensity?: number;
  onComplete?: () => void;
}

export function MuzzleFlash({ position, weaponType, intensity = 1, onComplete }: MuzzleFlashProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [flashTime, setFlashTime] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    // Flash duration based on weapon type
    const duration = getMuzzleFlashDuration(weaponType);
    
    const timeout = setTimeout(() => {
      setIsActive(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timeout);
  }, [weaponType, onComplete]);

  const getMuzzleFlashDuration = (type: string): number => {
    switch (type) {
      case 'pistol': return 100;
      case 'shotgun': return 150;
      case 'flamethrower': return 300;
      case 'rocket': return 200;
      case 'nuke': return 500;
      default: return 100;
    }
  };

  const getFlashColor = (): string => {
    switch (weaponType) {
      case 'pistol': return '#FFFF00';
      case 'shotgun': return '#FF8C00';
      case 'flamethrower': return '#FF4500';
      case 'rocket': return '#FF6600';
      case 'nuke': return '#00FF00';
      default: return '#FFFF00';
    }
  };

  const getFlashSize = (): number => {
    return (0.2 + weaponType === 'shotgun' ? 0.3 : 
           weaponType === 'rocket' ? 0.4 :
           weaponType === 'nuke' ? 0.6 : 0.2) * intensity;
  };

  useFrame((state, delta) => {
    if (!isActive) return;
    
    setFlashTime(prev => prev + delta);
    
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      
      // Flickering muzzle flash effect
      const flicker = Math.sin(time * 50) * 0.5 + 0.5;
      groupRef.current.scale.setScalar(flicker * 0.8 + 0.2);
      
      // Fade out over time
      const fadeProgress = flashTime / (getMuzzleFlashDuration(weaponType) / 1000);
      const opacity = Math.max(0, 1 - fadeProgress);
      
      groupRef.current.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          child.material.opacity = opacity;
        }
      });
    }
  });

  if (!isActive) return null;

  return (
    <group ref={groupRef} position={position}>
      {/* Main muzzle flash */}
      <mesh position={[0.5, 0, 0]}>
        <coneGeometry args={[getFlashSize(), getFlashSize() * 2, 6]} />
        <meshBasicMaterial 
          color={getFlashColor()} 
          transparent 
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Flash ring effect */}
      <mesh position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <ringGeometry args={[getFlashSize() * 0.5, getFlashSize() * 1.2, 8]} />
        <meshBasicMaterial 
          color={getFlashColor()} 
          transparent 
          opacity={0.6}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Smoke effect for realism */}
      <mesh position={[0.8, 0, 0]}>
        <sphereGeometry args={[getFlashSize() * 0.3, 6, 6]} />
        <meshBasicMaterial 
          color="#666666" 
          transparent 
          opacity={0.4}
        />
      </mesh>
      
      {/* Additional sparks for shotgun */}
      {weaponType === 'shotgun' && (
        <>
          <mesh position={[0.6, 0.1, 0.1]}>
            <sphereGeometry args={[0.02, 4, 4]} />
            <meshBasicMaterial 
              color="#FFD700" 
              transparent 
              opacity={0.8}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh position={[0.6, -0.1, -0.1]}>
            <sphereGeometry args={[0.02, 4, 4]} />
            <meshBasicMaterial 
              color="#FFD700" 
              transparent 
              opacity={0.8}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </>
      )}
      
      {/* Nuclear glow for nuke */}
      {weaponType === 'nuke' && (
        <mesh position={[0.5, 0, 0]} scale={[3, 3, 3]}>
          <sphereGeometry args={[getFlashSize(), 8, 8]} />
          <meshBasicMaterial 
            color="#00FF00" 
            transparent 
            opacity={0.3}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}