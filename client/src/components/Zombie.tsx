import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh } from "three";
import * as THREE from "three";

interface ZombieProps {
  zombie: {
    id: string;
    position: THREE.Vector3;
    health: number;
    speed: number;
    maxHealth: number;
  };
}

export function Zombie({ zombie }: ZombieProps) {
  const meshRef = useRef<Mesh>(null);

  // Animation and movement
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Simple bobbing animation
      const time = state.clock.elapsedTime;
      meshRef.current.position.y = zombie.position.y + Math.sin(time * 4 + zombie.id.length) * 0.1;
      
      // Rotate slightly for menacing effect
      meshRef.current.rotation.y = Math.sin(time * 2 + zombie.id.length) * 0.2;
    }
  });

  // Health-based color (green to red)
  const healthRatio = zombie.health / zombie.maxHealth;
  const color = new THREE.Color().setHSL(healthRatio * 0.3, 0.8, 0.5);

  return (
    <mesh
      ref={meshRef}
      position={[zombie.position.x, zombie.position.y, zombie.position.z]}
      castShadow
      receiveShadow
    >
      {/* Simple zombie body */}
      <boxGeometry args={[0.8, 1.8, 0.5]} />
      <meshLambertMaterial color={color} />
      
      {/* Zombie head */}
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.4, 8, 6]} />
        <meshLambertMaterial color={color} />
        
        {/* Simple eyes */}
        <mesh position={[-0.15, 0.1, 0.3]}>
          <sphereGeometry args={[0.05, 4, 4]} />
          <meshBasicMaterial color="red" />
        </mesh>
        <mesh position={[0.15, 0.1, 0.3]}>
          <sphereGeometry args={[0.05, 4, 4]} />
          <meshBasicMaterial color="red" />
        </mesh>
      </mesh>
      
      {/* Arms */}
      <mesh position={[-0.6, 0.3, 0]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.2, 0.8, 0.2]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[0.6, 0.3, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.2, 0.8, 0.2]} />
        <meshLambertMaterial color={color} />
      </mesh>
      
      {/* Legs */}
      <mesh position={[-0.2, -1.3, 0]}>
        <boxGeometry args={[0.25, 0.8, 0.25]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[0.2, -1.3, 0]}>
        <boxGeometry args={[0.25, 0.8, 0.25]} />
        <meshLambertMaterial color={color} />
      </mesh>
    </mesh>
  );
}
