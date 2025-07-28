import { useTexture } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

export function Environment() {
  const grassTexture = useTexture("/textures/grass.png");
  const asphaltTexture = useTexture("/textures/asphalt.png");
  
  // Configure textures for realism
  grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.repeat.set(25, 25);
  
  asphaltTexture.wrapS = asphaltTexture.wrapT = THREE.RepeatWrapping;
  asphaltTexture.repeat.set(15, 15);

  // Pre-calculate random positions for atmospheric objects
  const treePositions = useMemo(() => {
    const positions = [];
    for (let i = 0; i < 20; i++) {
      positions.push({
        x: (Math.random() - 0.5) * 80,
        z: -20 - Math.random() * 30,
        scale: 0.5 + Math.random() * 1,
        rotation: Math.random() * Math.PI * 2
      });
    }
    return positions;
  }, []);

  const debrisPositions = useMemo(() => {
    const positions = [];
    for (let i = 0; i < 15; i++) {
      positions.push({
        x: (Math.random() - 0.5) * 60,
        z: (Math.random() - 0.5) * 40,
        y: -1.8 + Math.random() * 0.2,
        scale: 0.3 + Math.random() * 0.8,
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI]
      });
    }
    return positions;
  }, []);

  return (
    <>
      {/* Enhanced ground with multiple textures */}
      <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial 
          map={grassTexture} 
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* Central combat area with asphalt */}
      <mesh position={[0, -1.98, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[25, 40]} />
        <meshStandardMaterial 
          map={asphaltTexture}
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>
      
      {/* Atmospheric fog plane for depth */}
      <mesh position={[0, 2, -40]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 30]} />
        <meshBasicMaterial 
          color="#666666" 
          transparent 
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Enhanced barrier walls with weathered look */}
      <mesh position={[-20, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 6, 50]} />
        <meshStandardMaterial 
          color="#444444" 
          roughness={0.9}
          metalness={0.1}
        />
        
        {/* Wall damage/wear details */}
        <mesh position={[0.5, 0, 0]}>
          <boxGeometry args={[0.5, 6.2, 50.2]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      </mesh>
      
      <mesh position={[20, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 6, 50]} />
        <meshStandardMaterial 
          color="#444444" 
          roughness={0.9}
          metalness={0.1}
        />
        
        <mesh position={[-0.5, 0, 0]}>
          <boxGeometry args={[0.5, 6.2, 50.2]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      </mesh>
      
      <mesh position={[0, 1, -25]} castShadow receiveShadow>
        <boxGeometry args={[40, 6, 2]} />
        <meshStandardMaterial 
          color="#444444" 
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      
      {/* Atmospheric dead trees */}
      {treePositions.map((pos, i) => (
        <group key={i} position={[pos.x, -2, pos.z]} scale={pos.scale} rotation={[0, pos.rotation, 0]}>
          {/* Tree trunk */}
          <mesh castShadow>
            <cylinderGeometry args={[0.2, 0.3, 4, 8]} />
            <meshStandardMaterial color="#2d1810" roughness={0.9} />
          </mesh>
          
          {/* Dead branches */}
          <mesh position={[0, 2.5, 0]} rotation={[0, 0, 0.3]} castShadow>
            <cylinderGeometry args={[0.05, 0.1, 2, 6]} />
            <meshStandardMaterial color="#1a0f08" />
          </mesh>
          <mesh position={[0, 2.5, 0]} rotation={[0, Math.PI/3, -0.4]} castShadow>
            <cylinderGeometry args={[0.05, 0.1, 1.5, 6]} />
            <meshStandardMaterial color="#1a0f08" />
          </mesh>
          <mesh position={[0, 2.5, 0]} rotation={[0, -Math.PI/3, 0.2]} castShadow>
            <cylinderGeometry args={[0.05, 0.1, 1.2, 6]} />
            <meshStandardMaterial color="#1a0f08" />
          </mesh>
        </group>
      ))}
      
      {/* Scattered debris and rubble */}
      {debrisPositions.map((pos, i) => (
        <mesh key={i} 
          position={[pos.x, pos.y, pos.z]} 
          scale={pos.scale}
          rotation={[pos.rotation[0], pos.rotation[1], pos.rotation[2]]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.5, 0.3, 0.8]} />
          <meshStandardMaterial 
            color={i % 3 === 0 ? "#555555" : i % 3 === 1 ? "#666666" : "#444444"}
            roughness={0.95}
            metalness={0.05}
          />
        </mesh>
      ))}
      
      {/* Atmospheric lighting enhancement */}
      <pointLight 
        position={[0, 8, 0]} 
        intensity={0.5} 
        color="#ffddaa"
        distance={30}
        decay={2}
      />
      
      {/* Rim lighting for dramatic effect */}
      <spotLight
        position={[-10, 10, -20]}
        intensity={0.3}
        angle={Math.PI / 6}
        penumbra={0.5}
        color="#ff6666"
        castShadow
      />
      
      <spotLight
        position={[10, 10, -20]}
        intensity={0.3}
        angle={Math.PI / 6}
        penumbra={0.5}
        color="#6666ff"
        castShadow
      />
    </>
  );
}
