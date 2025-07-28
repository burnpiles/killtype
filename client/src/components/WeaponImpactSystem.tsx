import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface WeaponImpactProps {
  position: THREE.Vector3;
  weaponType: 'pistol' | 'shotgun' | 'flamethrower' | 'rocket' | 'nuke';
  active: boolean;
  onComplete?: () => void;
}

export function WeaponImpactSystem({ position, weaponType, active, onComplete }: WeaponImpactProps) {
  const groupRef = useRef<THREE.Group>(null);
  const impactStartTime = useRef(0);
  const [limbFragments, setLimbFragments] = useState<Array<{
    id: number;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    rotation: THREE.Vector3;
    type: 'arm' | 'leg' | 'head' | 'torso';
  }>>([]);

  // Generate flying limbs and gore based on weapon type
  const generateImpactEffects = useMemo(() => {
    if (!active) return null;

    const effects = [];
    let limbCount = 0;
    let bloodIntensity = 1;

    switch (weaponType) {
      case 'pistol':
        limbCount = 1;
        bloodIntensity = 0.5;
        break;
      case 'shotgun':
        limbCount = 3;
        bloodIntensity = 1.5;
        break;
      case 'flamethrower':
        limbCount = 2;
        bloodIntensity = 0.8;
        break;
      case 'rocket':
        limbCount = 5;
        bloodIntensity = 3;
        break;
      case 'nuke':
        limbCount = 8;
        bloodIntensity = 5;
        break;
    }

    // Generate random limb fragments
    const limbTypes: ('arm' | 'leg' | 'head' | 'torso')[] = ['arm', 'leg', 'head', 'torso'];
    const fragments = [];

    for (let i = 0; i < limbCount; i++) {
      const limbType = limbTypes[Math.floor(Math.random() * limbTypes.length)];
      const explosionForce = weaponType === 'nuke' ? 15 : weaponType === 'rocket' ? 10 : 5;
      
      fragments.push({
        id: i,
        position: new THREE.Vector3(
          position.x + (Math.random() - 0.5) * 2,
          position.y + Math.random() * 2,
          position.z + (Math.random() - 0.5) * 2
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * explosionForce,
          Math.random() * explosionForce * 0.8 + 3,
          (Math.random() - 0.5) * explosionForce
        ),
        rotation: new THREE.Vector3(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ),
        type: limbType
      });
    }

    return { fragments, bloodIntensity };
  }, [active, weaponType, position]);

  useEffect(() => {
    if (generateImpactEffects) {
      setLimbFragments(generateImpactEffects.fragments);
    }
  }, [generateImpactEffects]);

  // Blood splatter particles
  const bloodParticles = useMemo(() => {
    if (!active) return null;

    const geometry = new THREE.BufferGeometry();
    const particleCount = weaponType === 'nuke' ? 500 : weaponType === 'rocket' ? 300 : 150;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = 0;
      
      // Blood spray pattern
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      const speed = 3 + Math.random() * 8;
      
      velocities[i3] = Math.sin(theta) * Math.cos(phi) * speed;
      velocities[i3 + 1] = Math.cos(theta) * speed * 0.5;
      velocities[i3 + 2] = Math.sin(theta) * Math.sin(phi) * speed;
      
      // Dark red blood colors
      const redIntensity = 0.5 + Math.random() * 0.5;
      colors[i3] = redIntensity;
      colors[i3 + 1] = Math.random() * 0.1;
      colors[i3 + 2] = Math.random() * 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return geometry;
  }, [active, weaponType]);

  const bloodMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.NormalBlending
    });
  }, []);

  useFrame((state, delta) => {
    if (!active) return;

    if (impactStartTime.current === 0) {
      impactStartTime.current = state.clock.elapsedTime;
    }

    const elapsedTime = state.clock.elapsedTime - impactStartTime.current;
    const effectDuration = 3.0;

    if (elapsedTime > effectDuration) {
      if (onComplete) onComplete();
      return;
    }

    // Update limb fragments
    setLimbFragments(prev => prev.map(limb => {
      const newVelocity = limb.velocity.clone();
      newVelocity.y -= 9.8 * delta; // Gravity
      newVelocity.multiplyScalar(0.98); // Air resistance

      const newPosition = limb.position.clone();
      newPosition.add(newVelocity.clone().multiplyScalar(delta));

      const newRotation = limb.rotation.clone();
      newRotation.x += delta * 5;
      newRotation.y += delta * 3;
      newRotation.z += delta * 4;

      return {
        ...limb,
        position: newPosition,
        velocity: newVelocity,
        rotation: newRotation
      };
    }));

    // Update blood particles
    if (bloodParticles && groupRef.current) {
      const positions = bloodParticles.attributes.position.array as Float32Array;
      const velocities = bloodParticles.attributes.velocity.array as Float32Array;
      const particleCount = positions.length / 3;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        positions[i3] += velocities[i3] * delta;
        positions[i3 + 1] += velocities[i3 + 1] * delta - 9.8 * delta * elapsedTime;
        positions[i3 + 2] += velocities[i3 + 2] * delta;
        
        velocities[i3] *= 0.99;
        velocities[i3 + 1] *= 0.99;
        velocities[i3 + 2] *= 0.99;
      }

      bloodParticles.attributes.position.needsUpdate = true;
    }
  });

  if (!active) return null;

  return (
    <group ref={groupRef} position={position}>
      {/* Blood spray particles */}
      {bloodParticles && (
        <points geometry={bloodParticles} material={bloodMaterial} />
      )}
      
      {/* Flying limb fragments */}
      {limbFragments.map((limb) => (
        <group key={limb.id} position={limb.position} rotation={[limb.rotation.x, limb.rotation.y, limb.rotation.z]}>
          {limb.type === 'arm' && (
            <mesh>
              <boxGeometry args={[0.15, 0.8, 0.15]} />
              <meshLambertMaterial color="#8B4513" />
            </mesh>
          )}
          {limb.type === 'leg' && (
            <mesh>
              <boxGeometry args={[0.2, 1, 0.2]} />
              <meshLambertMaterial color="#8B4513" />
            </mesh>
          )}
          {limb.type === 'head' && (
            <mesh>
              <sphereGeometry args={[0.3, 8, 8]} />
              <meshLambertMaterial color="#D2691E" />
            </mesh>
          )}
          {limb.type === 'torso' && (
            <mesh>
              <boxGeometry args={[0.6, 1.2, 0.4]} />
              <meshLambertMaterial color="#8B4513" />
            </mesh>
          )}
        </group>
      ))}

      {/* Weapon-specific effects */}
      {weaponType === 'flamethrower' && (
        <mesh>
          <sphereGeometry args={[1.5, 16, 16]} />
          <meshBasicMaterial 
            color="#FF4500" 
            transparent 
            opacity={0.4}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {(weaponType === 'rocket' || weaponType === 'nuke') && (
        <>
          {/* Explosion shockwave */}
          <mesh scale={[weaponType === 'nuke' ? 8 : 4, weaponType === 'nuke' ? 8 : 4, weaponType === 'nuke' ? 8 : 4]}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial 
              color={weaponType === 'nuke' ? "#00FF00" : "#FF8C00"} 
              transparent 
              opacity={0.2}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          
          {/* Central blast */}
          <mesh scale={[2, 2, 2]}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshBasicMaterial 
              color="#FFFFFF" 
              transparent 
              opacity={0.8}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </>
      )}
    </group>
  );
}