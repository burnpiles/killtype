import React, { useMemo, useRef } from "react";
import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Environment() {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  
  // Load available textures
  const [
    asphaltTexture,
    grassTexture,
    sandTexture,
    skyTexture,
    woodTexture
  ] = useTexture([
    "/textures/asphalt.png",
    "/textures/grass.png",
    "/textures/sand.jpg",
    "/textures/sky.png",
    "/textures/wood.jpg"
  ]);

  // Configure textures with proper tiling
  useMemo(() => {
    asphaltTexture.wrapS = asphaltTexture.wrapT = THREE.RepeatWrapping;
    asphaltTexture.repeat.set(4, 4);
    
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(2, 2);
    
    sandTexture.wrapS = sandTexture.wrapT = THREE.RepeatWrapping;
    sandTexture.repeat.set(6, 6);
    
    woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
    woodTexture.repeat.set(3, 3);
  }, [asphaltTexture, grassTexture, sandTexture, woodTexture]);

  // Dynamic atmospheric effects
  useFrame((state) => {
    if (ambientRef.current) {
      // Subtle ambient light pulsing for tension
      ambientRef.current.intensity = 0.15 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  // Generate facility elements (pillars, doorways, debris)
  const facilityElements = useMemo(() => {
    const elements = [];
    
    // Create pillars
    for (let i = 0; i < 12; i++) {
      const x = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 40;
      if (Math.abs(x) > 8 || Math.abs(z) > 8) { // Keep center clear
        elements.push({
          type: 'pillar',
          position: [x, 3, z],
          key: `pillar-${i}`
        });
      }
    }
    
    // Create debris piles
    for (let i = 0; i < 8; i++) {
      const x = (Math.random() - 0.5) * 35;
      const z = (Math.random() - 0.5) * 35;
      if (Math.abs(x) > 6 || Math.abs(z) > 6) {
        elements.push({
          type: 'debris',
          position: [x, 0.5, z],
          key: `debris-${i}`
        });
      }
    }
    
    return elements;
  }, []);

  return (
    <>
      {/* Atmospheric fog */}
      <fog attach="fog" args={["#1a1a1a", 10, 50]} />
      
      {/* Dynamic ambient lighting */}
      <ambientLight ref={ambientRef} intensity={0.2} color="#666666" />
      
      {/* Main directional light (emergency lighting) */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.8}
        color="#ff6666"
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={50}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      
      {/* Emergency red point lights */}
      <pointLight position={[-15, 8, -15]} intensity={1.2} color="#ff0000" distance={20} />
      <pointLight position={[15, 8, 15]} intensity={1.2} color="#ff0000" distance={20} />
      <pointLight position={[-15, 8, 15]} intensity={1.2} color="#ff0000" distance={20} />
      <pointLight position={[15, 8, -15]} intensity={1.2} color="#ff0000" distance={20} />
      
      {/* Flickering fluorescent lights */}
      <rectAreaLight
        position={[0, 10, 0]}
        width={30}
        height={2}
        intensity={0.6}
        color="#cccccc"
      />
      
      {/* Underground facility floor */}
      <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial 
          map={asphaltTexture}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      
      {/* Stains and wear on floor */}
      <mesh position={[0, -1.98, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial 
          map={sandTexture}
          transparent
          opacity={0.4}
          color="#8B4513"
        />
      </mesh>
      
      {/* Industrial ceiling */}
      <mesh position={[0, 12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial 
          map={woodTexture}
          roughness={0.4}
          metalness={0.6}
          color="#2a2a2a"
        />
      </mesh>
      
      {/* Facility walls */}
      <mesh position={[30, 5, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[60, 14]} />
        <meshStandardMaterial 
          map={asphaltTexture}
          roughness={0.8}
          metalness={0.2}
          color="#404040"
        />
      </mesh>
      
      <mesh position={[-30, 5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[60, 14]} />
        <meshStandardMaterial 
          map={asphaltTexture}
          roughness={0.8}
          metalness={0.2}
          color="#404040"
        />
      </mesh>
      
      <mesh position={[0, 5, 30]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[60, 14]} />
        <meshStandardMaterial 
          map={asphaltTexture}
          roughness={0.8}
          metalness={0.2}
          color="#404040"
        />
      </mesh>
      
      <mesh position={[0, 5, -30]} receiveShadow>
        <planeGeometry args={[60, 14]} />
        <meshStandardMaterial 
          map={asphaltTexture}
          roughness={0.8}
          metalness={0.2}
          color="#404040"
        />
      </mesh>
      
      {/* Facility elements */}
      {facilityElements.map(element => (
        <group key={element.key}>
          {element.type === 'pillar' && (
            <mesh position={element.position as [number, number, number]} castShadow receiveShadow>
              <cylinderGeometry args={[0.8, 1.2, 6, 8]} />
              <meshStandardMaterial 
                map={woodTexture}
                roughness={0.7}
                metalness={0.3}
                color="#555555"
              />
            </mesh>
          )}
          
          {element.type === 'debris' && (
            <mesh position={element.position as [number, number, number]} castShadow>
              <boxGeometry args={[
                1 + Math.random(),
                0.3 + Math.random() * 0.7,
                1 + Math.random()
              ]} />
              <meshStandardMaterial 
                map={sandTexture}
                roughness={0.9}
                metalness={0.1}
                color="#654321"
              />
            </mesh>
          )}
        </group>
      ))}
      
      {/* Atmospheric particle effects */}
      <mesh position={[10, 8, -15]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial 
          color="#666666"
          transparent
          opacity={0.1}
        />
      </mesh>
      
      {/* Volumetric lighting shafts */}
      <mesh position={[0, 6, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[8, 12, 32]} />
        <meshBasicMaterial 
          color="#cccccc"
          transparent
          opacity={0.02}
        />
      </mesh>
    </>
  );
}
