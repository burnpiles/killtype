import React, { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface FlyingLimb {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotationVelocity: THREE.Vector3;
  rotation: THREE.Vector3;
  limbType: 'arm' | 'leg' | 'head' | 'torso';
  size: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface FlyingLimbsProps {
  position: THREE.Vector3;
  explosionForce?: number;
  onComplete?: () => void;
}

export function FlyingLimbs({ position, explosionForce = 1, onComplete }: FlyingLimbsProps) {
  const [limbs, setLimbs] = useState<FlyingLimb[]>([]);
  const groupRef = useRef<THREE.Group>(null);
  const limbId = useRef(0);

  useEffect(() => {
    // Create flying limbs on explosive death
    const newLimbs: FlyingLimb[] = [];
    const limbTypes: FlyingLimb['limbType'][] = ['arm', 'leg', 'head', 'torso'];

    limbTypes.forEach((limbType, i) => {
      const angle = (Math.PI * 2 * i) / limbTypes.length + (Math.random() - 0.5) * 1;
      const speed = (4 + Math.random() * 6) * explosionForce;
      const upwardForce = (3 + Math.random() * 4) * explosionForce;

      let size: THREE.Vector3;
      switch (limbType) {
        case 'head':
          size = new THREE.Vector3(0.3, 0.35, 0.3);
          break;
        case 'torso':
          size = new THREE.Vector3(0.4, 0.6, 0.25);
          break;
        case 'arm':
          size = new THREE.Vector3(0.15, 0.5, 0.15);
          break;
        case 'leg':
          size = new THREE.Vector3(0.18, 0.6, 0.18);
          break;
      }

      newLimbs.push({
        id: `limb_${limbId.current++}`,
        position: position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          Math.random() * 0.3,
          (Math.random() - 0.5) * 0.5
        )),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          upwardForce,
          Math.sin(angle) * speed
        ),
        rotationVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20
        ),
        rotation: new THREE.Vector3(0, 0, 0),
        limbType,
        size,
        life: 0,
        maxLife: 5 + Math.random() * 3
      });
    });

    setLimbs(newLimbs);

    // Auto-cleanup
    const timeout = setTimeout(() => {
      onComplete?.();
    }, 8000);

    return () => clearTimeout(timeout);
  }, [position, explosionForce, onComplete]);

  useFrame((state, delta) => {
    setLimbs(prev => {
      return prev.map(limb => {
        const newLimb = { ...limb };
        
        // Update position with velocity
        newLimb.position.add(
          newLimb.velocity.clone().multiplyScalar(delta)
        );
        
        // Apply gravity
        newLimb.velocity.y -= 9.8 * delta;
        
        // Add air resistance
        newLimb.velocity.multiplyScalar(0.99);
        
        // Update rotation
        newLimb.rotation.add(
          newLimb.rotationVelocity.clone().multiplyScalar(delta)
        );
        
        // Slow down rotation over time
        newLimb.rotationVelocity.multiplyScalar(0.98);
        
        // Update life
        newLimb.life += delta;
        
        // Bounce off ground (simple)
        if (newLimb.position.y < -3 && newLimb.velocity.y < 0) {
          newLimb.velocity.y *= -0.4;
          newLimb.position.y = -3;
        }
        
        return newLimb;
      }).filter(limb => limb.life < limb.maxLife && limb.position.y > -10);
    });
  });

  return (
    <group ref={groupRef}>
      {limbs.map(limb => (
        <FlyingLimbVisual key={limb.id} limb={limb} />
      ))}
    </group>
  );
}

function FlyingLimbVisual({ limb }: { limb: FlyingLimb }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(limb.position);
      meshRef.current.rotation.set(limb.rotation.x, limb.rotation.y, limb.rotation.z);
      
      // Fade out over time
      const alpha = Math.max(0.3, 1 - (limb.life / limb.maxLife));
      if (meshRef.current.material instanceof THREE.MeshLambertMaterial) {
        meshRef.current.material.opacity = alpha;
      }
    }
  });

  // Different colors and shapes for different limb types
  const getLimbColor = () => {
    switch (limb.limbType) {
      case 'head': return '#8B4513';
      case 'torso': return '#654321';
      case 'arm': return '#A0522D';
      case 'leg': return '#8B7355';
      default: return '#696969';
    }
  };

  const getLimbGeometry = () => {
    switch (limb.limbType) {
      case 'head':
        return <sphereGeometry args={[limb.size.x, 8, 8]} />;
      case 'torso':
        return <boxGeometry args={[limb.size.x, limb.size.y, limb.size.z]} />;
      case 'arm':
      case 'leg':
        return <cylinderGeometry args={[limb.size.x, limb.size.x * 0.8, limb.size.y, 8]} />;
      default:
        return <boxGeometry args={[limb.size.x, limb.size.y, limb.size.z]} />;
    }
  };

  return (
    <mesh ref={meshRef}>
      {getLimbGeometry()}
      <meshLambertMaterial 
        color={getLimbColor()} 
        transparent 
        opacity={1}
      />
    </mesh>
  );
}