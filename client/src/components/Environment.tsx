import { useTexture } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

export function Environment() {
  const woodTexture = useTexture("/textures/wood.jpg");
  const sandTexture = useTexture("/textures/sand.jpg");
  
  // Configure textures for indoor horror atmosphere
  woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.repeat.set(8, 8);
  
  sandTexture.wrapS = sandTexture.wrapT = THREE.RepeatWrapping;
  sandTexture.repeat.set(12, 12);

  // Pre-calculate positions for industrial horror environment
  const pillarsPositions = useMemo(() => {
    const positions = [];
    // Create a grid of support pillars like in the image
    for (let x = -15; x <= 15; x += 10) {
      for (let z = -15; z <= 5; z += 10) {
        if (Math.abs(x) > 5 || z < -5) { // Don't block center area
          positions.push({ x, z });
        }
      }
    }
    return positions;
  }, []);

  const ventPositions = useMemo(() => {
    const positions = [];
    for (let i = 0; i < 8; i++) {
      positions.push({
        x: (Math.random() - 0.5) * 30,
        z: -10 - Math.random() * 15,
        y: 8 + Math.random() * 2,
        rotation: Math.random() * Math.PI * 2
      });
    }
    return positions;
  }, []);

  return (
    <>
      {/* Industrial warehouse floor */}
      <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial 
          map={sandTexture} 
          color="#444444"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      
      {/* Concrete ceiling with industrial look */}
      <mesh position={[0, 12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial 
          color="#2a2a2a"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>
      
      {/* Back wall with industrial detailing */}
      <mesh position={[0, 5, -25]} receiveShadow>
        <planeGeometry args={[50, 14]} />
        <meshStandardMaterial 
          map={woodTexture}
          color="#3a3a3a"
          roughness={0.7}
          metalness={0.3}
        />
      </mesh>
      
      {/* Left wall */}
      <mesh position={[-25, 5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[50, 14]} />
        <meshStandardMaterial 
          color="#3a3a3a"
          roughness={0.7}
          metalness={0.3}
        />
      </mesh>
      
      {/* Right wall */}
      <mesh position={[25, 5, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[50, 14]} />
        <meshStandardMaterial 
          color="#3a3a3a"
          roughness={0.7}
          metalness={0.3}
        />
      </mesh>
      
      {/* Industrial support pillars */}
      {pillarsPositions.map((pos, i) => (
        <group key={i} position={[pos.x, 0, pos.z]}>
          {/* Main pillar */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.5, 12, 1.5]} />
            <meshStandardMaterial 
              color="#555555"
              roughness={0.8}
              metalness={0.4}
            />
          </mesh>
          
          {/* Pillar reinforcement rings */}
          <mesh position={[0, 2, 0]} castShadow>
            <cylinderGeometry args={[0.9, 0.9, 0.3, 8]} />
            <meshStandardMaterial color="#666666" metalness={0.6} />
          </mesh>
          <mesh position={[0, 6, 0]} castShadow>
            <cylinderGeometry args={[0.9, 0.9, 0.3, 8]} />
            <meshStandardMaterial color="#666666" metalness={0.6} />
          </mesh>
          <mesh position={[0, 10, 0]} castShadow>
            <cylinderGeometry args={[0.9, 0.9, 0.3, 8]} />
            <meshStandardMaterial color="#666666" metalness={0.6} />
          </mesh>
        </group>
      ))}
      
      {/* Ceiling ventilation ducts */}
      {ventPositions.map((pos, i) => (
        <group key={i} position={[pos.x, pos.y, pos.z]} rotation={[0, pos.rotation, 0]}>
          <mesh>
            <cylinderGeometry args={[0.8, 0.8, 8, 8]} />
            <meshStandardMaterial 
              color="#777777"
              roughness={0.3}
              metalness={0.8}
            />
          </mesh>
          
          {/* Vent grilles */}
          <mesh position={[0, -4.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.3, 0.7, 8]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
        </group>
      ))}
      
      {/* Industrial lighting fixtures */}
      <mesh position={[0, 10, -15]} castShadow>
        <boxGeometry args={[8, 0.5, 1]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      <mesh position={[-10, 10, 0]} castShadow>
        <boxGeometry args={[1, 0.5, 8]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      <mesh position={[10, 10, 0]} castShadow>
        <boxGeometry args={[1, 0.5, 8]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      
      {/* Broken glass window frames on back wall */}
      <mesh position={[-8, 8, -24.8]}>
        <boxGeometry args={[4, 3, 0.2]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[8, 8, -24.8]}>
        <boxGeometry args={[4, 3, 0.2]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Horror atmosphere lighting - dim and moody */}
      <ambientLight intensity={0.1} color="#404040" />
      
      {/* Main harsh fluorescent lighting */}
      <rectAreaLight
        position={[0, 9, -15]}
        width={8}
        height={1}
        intensity={2}
        color="#e6f3ff"
      />
      
      <rectAreaLight
        position={[-10, 9, 0]}
        width={1}
        height={8}
        intensity={1.5}
        color="#e6f3ff"
      />
      
      <rectAreaLight
        position={[10, 9, 0]}
        width={1}
        height={8}
        intensity={1.5}
        color="#e6f3ff"
      />
      
      {/* Dramatic spot lighting for zombie encounters */}
      <spotLight
        position={[0, 8, -5]}
        intensity={1}
        angle={Math.PI / 3}
        penumbra={0.3}
        color="#ffffff"
        castShadow
      />
      
      {/* Emergency lighting - red glow */}
      <pointLight 
        position={[-20, 10, -20]} 
        intensity={0.3} 
        color="#ff3333"
        distance={15}
      />
      
      <pointLight 
        position={[20, 10, -20]} 
        intensity={0.3} 
        color="#ff3333"
        distance={15}
      />
    </>
  );
}
