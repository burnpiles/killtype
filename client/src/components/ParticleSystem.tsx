import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ParticleSystemProps {
  position: THREE.Vector3;
  type: 'pistol' | 'shotgun' | 'flamethrower' | 'rocket' | 'nuke';
  intensity?: number;
}

export function ParticleSystem({ position, type, intensity = 1 }: ParticleSystemProps) {
  const particlesRef = useRef<THREE.Points>(null);
  
  const { particles, particleCount } = useMemo(() => {
    let count = 0;
    let spread = 1;
    let speed = 5;
    let colors: number[] = [];
    
    switch (type) {
      case 'pistol':
        count = 20;
        spread = 0.5;
        speed = 3;
        colors = [1, 1, 0.2]; // Yellow
        break;
      case 'shotgun':
        count = 50;
        spread = 1.5;
        speed = 4;
        colors = [1, 0.5, 0]; // Orange
        break;
      case 'flamethrower':
        count = 100;
        spread = 2;
        speed = 6;
        colors = [1, 0.2, 0]; // Red
        break;
      case 'rocket':
        count = 200;
        spread = 3;
        speed = 8;
        colors = [1, 0, 0]; // Bright red
        break;
      case 'nuke':
        count = 500;
        spread = 5;
        speed = 10;
        colors = [1, 1, 1]; // White
        break;
    }
    
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const particleColors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Position
      positions[i3] = position.x + (Math.random() - 0.5) * spread;
      positions[i3 + 1] = position.y + (Math.random() - 0.5) * spread;
      positions[i3 + 2] = position.z + (Math.random() - 0.5) * spread;
      
      // Velocity
      velocities[i3] = (Math.random() - 0.5) * speed;
      velocities[i3 + 1] = (Math.random() - 0.5) * speed;
      velocities[i3 + 2] = (Math.random() - 0.5) * speed;
      
      // Color
      particleColors[i3] = colors[0] + Math.random() * 0.3;
      particleColors[i3 + 1] = colors[1] + Math.random() * 0.3;
      particleColors[i3 + 2] = colors[2] + Math.random() * 0.3;
    }
    
    return {
      particles: {
        positions,
        velocities,
        colors: particleColors
      },
      particleCount: count
    };
  }, [position, type]);
  
  useFrame((state, delta) => {
    if (particlesRef.current && particles) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const colors = particlesRef.current.geometry.attributes.color.array as Float32Array;
      
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Update positions
        positions[i3] += particles.velocities[i3] * delta;
        positions[i3 + 1] += particles.velocities[i3 + 1] * delta;
        positions[i3 + 2] += particles.velocities[i3 + 2] * delta;
        
        // Fade particles over time
        const alpha = Math.max(0, 1 - state.clock.elapsedTime * 0.5);
        colors[i3] = particles.colors[i3] * alpha;
        colors[i3 + 1] = particles.colors[i3 + 1] * alpha;
        colors[i3 + 2] = particles.colors[i3 + 2] * alpha;
        
        // Apply gravity and air resistance
        particles.velocities[i3 + 1] -= 9.8 * delta; // Gravity
        particles.velocities[i3] *= 0.98; // Air resistance
        particles.velocities[i3 + 2] *= 0.98;
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      particlesRef.current.geometry.attributes.color.needsUpdate = true;
    }
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={particles.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={type === 'nuke' ? 0.3 : 0.1}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}