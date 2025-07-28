import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ExplosionEffectProps {
  position: THREE.Vector3;
  active: boolean;
  onComplete?: () => void;
}

export function ExplosionEffect({ position, active, onComplete }: ExplosionEffectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const explosionStartTime = useRef(0);

  // Create explosion particles
  const explosionGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Start all particles at explosion center
      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = 0;
      
      // Random explosion velocities (spherical distribution)
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      const speed = 5 + Math.random() * 10;
      
      velocities[i3] = Math.sin(theta) * Math.cos(phi) * speed;
      velocities[i3 + 1] = Math.cos(theta) * speed;
      velocities[i3 + 2] = Math.sin(theta) * Math.sin(phi) * speed;
      
      // Fire colors (red, orange, yellow)
      const colorChoice = Math.random();
      if (colorChoice < 0.3) {
        colors[i3] = 1; colors[i3 + 1] = 0; colors[i3 + 2] = 0; // Red
      } else if (colorChoice < 0.7) {
        colors[i3] = 1; colors[i3 + 1] = 0.5; colors[i3 + 2] = 0; // Orange
      } else {
        colors[i3] = 1; colors[i3 + 1] = 1; colors[i3 + 2] = 0; // Yellow
      }
      
      sizes[i] = 0.2 + Math.random() * 0.3;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    return geometry;
  }, []);

  const explosionMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });
  }, []);

  useFrame((state, delta) => {
    if (!active) return;

    if (explosionStartTime.current === 0) {
      explosionStartTime.current = state.clock.elapsedTime;
    }

    const elapsedTime = state.clock.elapsedTime - explosionStartTime.current;
    const explosionDuration = 2.0;

    if (elapsedTime > explosionDuration) {
      if (onComplete) onComplete();
      return;
    }

    // Simple visual fade without buffer updates
    const fadeProgress = elapsedTime / explosionDuration;
    explosionMaterial.opacity = Math.max(0, 0.8 * (1 - fadeProgress));
  });

  if (!active) return null;

  return (
    <group ref={groupRef} position={position}>
      {/* Simple explosion effects without complex particles */}
      
      {/* Explosion flash */}
      <mesh>
        <sphereGeometry args={[2, 16, 16]} />
        <meshBasicMaterial 
          color="#ffaa00" 
          transparent 
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Outer blast wave */}
      <mesh scale={[4, 4, 4]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial 
          color="#ff6600" 
          transparent 
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Smoke clouds */}
      <mesh scale={[3, 3, 3]} position={[0, 1, 0]}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial 
          color="#333333" 
          transparent 
          opacity={0.4}
        />
      </mesh>
      
      <mesh scale={[2, 2, 2]} position={[1, 0.5, 1]}>
        <sphereGeometry args={[0.7, 8, 8]} />
        <meshBasicMaterial 
          color="#666666" 
          transparent 
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}