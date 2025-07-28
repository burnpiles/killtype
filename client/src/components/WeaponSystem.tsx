import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useZombieGame } from "../lib/stores/useZombieGame";
import * as THREE from "three";

export function WeaponSystem() {
  const { currentWeapon, lastShot } = useZombieGame();
  const muzzleFlashRef = useRef<THREE.Mesh>(null);

  // Animate muzzle flash
  useFrame((state) => {
    if (muzzleFlashRef.current && lastShot) {
      const timeSinceShot = state.clock.elapsedTime - lastShot;
      if (timeSinceShot < 0.1) {
        // Show muzzle flash
        muzzleFlashRef.current.visible = true;
        muzzleFlashRef.current.scale.setScalar(1 - timeSinceShot * 10);
      } else {
        muzzleFlashRef.current.visible = false;
      }
    }
  });

  return (
    <group position={[0, 1, 8]}>
      {/* Simple weapon representation */}
      <mesh position={[0.5, -0.3, 0]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={getWeaponSize(currentWeapon)} />
        <meshLambertMaterial color={getWeaponColor(currentWeapon)} />
      </mesh>
      
      {/* Muzzle flash */}
      <mesh ref={muzzleFlashRef} position={[0.5, -0.2, -0.5]} visible={false}>
        <sphereGeometry args={[0.3, 8, 6]} />
        <meshBasicMaterial color="#ffff44" transparent opacity={0.8} />
      </mesh>
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
