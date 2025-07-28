import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Projectile {
  id: string;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  type: 'bullet' | 'shell' | 'flame' | 'rocket' | 'nuke';
  startTime: number;
  maxDistance: number;
}

interface ProjectileSystemProps {
  onProjectileHit?: (projectile: Projectile, position: THREE.Vector3) => void;
}

export function ProjectileSystem({ onProjectileHit }: ProjectileSystemProps) {
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const projectileId = useRef(0);

  // Add projectile from weapon fire
  const fireProjectile = (
    startPos: THREE.Vector3,
    direction: THREE.Vector3,
    weaponType: 'pistol' | 'shotgun' | 'flamethrower' | 'rocket' | 'nuke'
  ) => {
    const baseSpeed = 25;
    let projectileType: Projectile['type'] = 'bullet';
    let speed = baseSpeed;
    let maxDistance = 50;

    switch (weaponType) {
      case 'pistol':
        projectileType = 'bullet';
        speed = baseSpeed * 1.2;
        break;
      case 'shotgun':
        projectileType = 'shell';
        speed = baseSpeed * 0.8;
        maxDistance = 30;
        break;
      case 'flamethrower':
        projectileType = 'flame';
        speed = baseSpeed * 0.6;
        maxDistance = 15;
        break;
      case 'rocket':
        projectileType = 'rocket';
        speed = baseSpeed * 0.9;
        maxDistance = 100;
        break;
      case 'nuke':
        projectileType = 'nuke';
        speed = baseSpeed * 0.7;
        maxDistance = 150;
        break;
    }

    const newProjectile: Projectile = {
      id: `projectile_${projectileId.current++}`,
      position: startPos.clone(),
      direction: direction.clone().normalize(),
      speed,
      type: projectileType,
      startTime: Date.now(),
      maxDistance
    };

    setProjectiles(prev => [...prev, newProjectile]);
  };

  // Update projectiles each frame
  useFrame((state, delta) => {
    setProjectiles(prev => {
      const updated = prev.map(projectile => {
        const newPosition = projectile.position.clone();
        newPosition.add(
          projectile.direction.clone().multiplyScalar(projectile.speed * delta)
        );

        // Check if projectile traveled max distance or hit something
        const travelDistance = newPosition.distanceTo(
          projectile.position.clone().sub(
            projectile.direction.clone().multiplyScalar(projectile.speed * delta * 100)
          )
        );

        if (travelDistance > projectile.maxDistance) {
          return null; // Remove projectile
        }

        return {
          ...projectile,
          position: newPosition
        };
      }).filter(Boolean) as Projectile[];

      return updated;
    });
  });

  // Expose fire method globally (this could be improved with context)
  useEffect(() => {
    (window as any).fireProjectile = fireProjectile;
    return () => {
      delete (window as any).fireProjectile;
    };
  }, []);

  return (
    <>
      {projectiles.map(projectile => (
        <ProjectileVisual key={projectile.id} projectile={projectile} />
      ))}
    </>
  );
}

function ProjectileVisual({ projectile }: { projectile: Projectile }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(projectile.position);
      
      // Orient projectile in direction of travel
      const direction = projectile.direction.clone();
      meshRef.current.lookAt(
        meshRef.current.position.clone().add(direction)
      );
    }
  });

  // Render different visuals based on projectile type
  switch (projectile.type) {
    case 'bullet':
      return (
        <mesh ref={meshRef}>
          <sphereGeometry args={[0.02, 6, 6]} />
          <meshBasicMaterial color="#FFD700" />
        </mesh>
      );
    
    case 'shell':
      return (
        <group ref={meshRef}>
          {/* Multiple pellets for shotgun */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.015, 4, 4]} />
            <meshBasicMaterial color="#C0C0C0" />
          </mesh>
          <mesh position={[0.05, 0, 0]}>
            <sphereGeometry args={[0.015, 4, 4]} />
            <meshBasicMaterial color="#C0C0C0" />
          </mesh>
          <mesh position={[-0.05, 0, 0]}>
            <sphereGeometry args={[0.015, 4, 4]} />
            <meshBasicMaterial color="#C0C0C0" />
          </mesh>
        </group>
      );
    
    case 'flame':
      return (
        <mesh ref={meshRef}>
          <coneGeometry args={[0.1, 0.3, 6]} />
          <meshBasicMaterial 
            color="#FF4500" 
            transparent 
            opacity={0.8}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      );
    
    case 'rocket':
      return (
        <group ref={meshRef}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.05, 0.2]} />
            <meshLambertMaterial color="#8B4513" />
          </mesh>
          {/* Rocket trail */}
          <mesh position={[0, -0.2, 0]}>
            <coneGeometry args={[0.05, 0.15, 6]} />
            <meshBasicMaterial 
              color="#FF6600" 
              transparent 
              opacity={0.7}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      );
    
    case 'nuke':
      return (
        <group ref={meshRef}>
          <mesh>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial 
              color="#00FF00" 
              transparent 
              opacity={0.9}
            />
          </mesh>
          {/* Nuclear glow */}
          <mesh scale={[2, 2, 2]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial 
              color="#00FF00" 
              transparent 
              opacity={0.3}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      );
    
    default:
      return null;
  }
}