import React, { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface BloodParticle {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

interface BloodSplatterProps {
  position: THREE.Vector3;
  intensity?: number;
  onComplete?: () => void;
}

export function BloodSplatter({ position, intensity = 1, onComplete }: BloodSplatterProps) {
  const [particles, setParticles] = useState<BloodParticle[]>([]);
  const groupRef = useRef<THREE.Group>(null);
  const particleId = useRef(0);

  useEffect(() => {
    // Create blood particles on mount
    const newParticles: BloodParticle[] = [];
    const particleCount = Math.min(12, Math.floor(8 * intensity));

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const speed = 3 + Math.random() * 4;
      const upwardForce = 2 + Math.random() * 3;

      newParticles.push({
        id: `blood_${particleId.current++}`,
        position: position.clone(),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          upwardForce,
          Math.sin(angle) * speed
        ),
        size: 0.05 + Math.random() * 0.1,
        life: 0,
        maxLife: 2 + Math.random() * 2,
        color: new THREE.Color().setHSL(0, 0.8 + Math.random() * 0.2, 0.2 + Math.random() * 0.3)
      });
    }

    setParticles(newParticles);

    // Auto-cleanup after animation
    const timeout = setTimeout(() => {
      onComplete?.();
    }, 4000);

    return () => clearTimeout(timeout);
  }, [position, intensity, onComplete]);

  useFrame((state, delta) => {
    setParticles(prev => {
      return prev.map(particle => {
        const newParticle = { ...particle };
        
        // Update position with velocity
        newParticle.position.add(
          newParticle.velocity.clone().multiplyScalar(delta)
        );
        
        // Apply gravity
        newParticle.velocity.y -= 9.8 * delta;
        
        // Add air resistance
        newParticle.velocity.multiplyScalar(0.98);
        
        // Update life
        newParticle.life += delta;
        
        return newParticle;
      }).filter(particle => particle.life < particle.maxLife);
    });
  });

  return (
    <group ref={groupRef}>
      {particles.map(particle => (
        <BloodParticleVisual key={particle.id} particle={particle} />
      ))}
    </group>
  );
}

function BloodParticleVisual({ particle }: { particle: BloodParticle }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(particle.position);
      
      // Fade out over time
      const alpha = 1 - (particle.life / particle.maxLife);
      if (meshRef.current.material instanceof THREE.MeshBasicMaterial) {
        meshRef.current.material.opacity = alpha;
      }
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[particle.size, 6, 6]} />
      <meshBasicMaterial 
        color={particle.color} 
        transparent 
        opacity={1}
      />
    </mesh>
  );
}