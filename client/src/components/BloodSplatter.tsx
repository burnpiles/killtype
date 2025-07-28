import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface BloodSplatterProps {
  position: THREE.Vector3;
  intensity: number;
  active: boolean;
}

export function BloodSplatter({ position, intensity, active }: BloodSplatterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef(0);

  // Create multiple blood droplet meshes
  const bloodDroplets = useMemo(() => {
    if (!active) return [];
    
    const droplets = [];
    const count = intensity * 15;
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const distance = 0.5 + Math.random() * 2;
      const height = Math.random() * 3;
      
      droplets.push({
        id: i,
        initialPosition: new THREE.Vector3(
          Math.cos(angle) * distance,
          height,
          Math.sin(angle) * distance
        ),
        velocity: new THREE.Vector3(
          Math.cos(angle) * (2 + Math.random() * 3),
          2 + Math.random() * 4,
          Math.sin(angle) * (2 + Math.random() * 3)
        ),
        size: 0.05 + Math.random() * 0.1
      });
    }
    
    return droplets;
  }, [active, intensity]);

  useFrame((state) => {
    if (!active || !groupRef.current) return;

    if (startTime.current === 0) {
      startTime.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - startTime.current;
    
    if (elapsed > 2) return;

    // Update droplet positions with gravity
    groupRef.current.children.forEach((child, index) => {
      if (index < bloodDroplets.length) {
        const droplet = bloodDroplets[index];
        const t = elapsed;
        
        child.position.copy(droplet.initialPosition);
        child.position.x += droplet.velocity.x * t;
        child.position.y += droplet.velocity.y * t - 4.9 * t * t; // Gravity
        child.position.z += droplet.velocity.z * t;
        
        // Fade out
        const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        material.opacity = Math.max(0, 1 - elapsed / 2);
      }
    });
  });

  if (!active) return null;

  return (
    <group ref={groupRef} position={position}>
      {bloodDroplets.map((droplet) => (
        <mesh key={droplet.id} position={droplet.initialPosition}>
          <sphereGeometry args={[droplet.size, 6, 6]} />
          <meshBasicMaterial 
            color="#8B0000" 
            transparent 
            opacity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}