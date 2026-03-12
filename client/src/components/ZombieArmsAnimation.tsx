import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ZombieArmsAnimationProps {
  zombieRef: React.RefObject<THREE.Group>;
  walkSpeed: number;
  isWalking: boolean;
}

export function ZombieArmsAnimation({ zombieRef, walkSpeed, isWalking }: ZombieArmsAnimationProps) {
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!isWalking || !zombieRef.current) return;
    
    const time = state.clock.elapsedTime;
    const walkCycle = time * walkSpeed;
    
    // Zombie arm swaying - opposite to walking pattern
    const leftArmSwing = Math.sin(walkCycle) * 0.6; // More dramatic swing
    const rightArmSwing = Math.sin(walkCycle + Math.PI) * 0.6; // Opposite phase
    
    // Apply arm animations if arms exist
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = leftArmSwing - 0.3; // Slight downward hang
      leftArmRef.current.rotation.z = Math.sin(walkCycle * 0.5) * 0.2;
    }
    
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = rightArmSwing - 0.3;
      rightArmRef.current.rotation.z = -Math.sin(walkCycle * 0.5) * 0.2;
    }
    
    // Zombie head bobbing and searching
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(walkCycle * 0.3) * 0.4; // Head searching
      headRef.current.rotation.x = -0.2 + Math.sin(walkCycle * 0.7) * 0.1; // Slight nod
    }
    
    // Body sway and hunch
    if (bodyRef.current) {
      bodyRef.current.rotation.z = Math.sin(walkCycle) * 0.15; // Side sway
      bodyRef.current.rotation.x = -0.4; // Permanent hunch
    }
  });

  return (
    <group>
      {/* Left Arm */}
      <mesh ref={leftArmRef} position={[-0.3, 0.5, 0]}>
        <boxGeometry args={[0.1, 0.6, 0.1]} />
        <meshStandardMaterial color="#8B7355" roughness={0.8} />
        
        {/* Left Forearm */}
        <mesh position={[0, -0.4, 0]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.08, 0.4, 0.08]} />
          <meshStandardMaterial color="#8B7355" roughness={0.8} />
          
          {/* Left Hand */}
          <mesh position={[0, -0.25, 0]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.06, 0.15, 0.03]} />
            <meshStandardMaterial color="#8B7355" roughness={0.8} />
          </mesh>
        </mesh>
      </mesh>
      
      {/* Right Arm */}
      <mesh ref={rightArmRef} position={[0.3, 0.5, 0]}>
        <boxGeometry args={[0.1, 0.6, 0.1]} />
        <meshStandardMaterial color="#8B7355" roughness={0.8} />
        
        {/* Right Forearm */}
        <mesh position={[0, -0.4, 0]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.08, 0.4, 0.08]} />
          <meshStandardMaterial color="#8B7355" roughness={0.8} />
          
          {/* Right Hand */}
          <mesh position={[0, -0.25, 0]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.06, 0.15, 0.03]} />
            <meshStandardMaterial color="#8B7355" roughness={0.8} />
          </mesh>
        </mesh>
      </mesh>
      
      {/* Head */}
      <mesh ref={headRef} position={[0, 1, 0]}>
        <boxGeometry args={[0.25, 0.25, 0.25]} />
        <meshStandardMaterial color="#A0956B" roughness={0.7} />
        
        {/* Eyes */}
        <mesh position={[-0.08, 0.05, 0.12]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color="#ff0000" />
        </mesh>
        <mesh position={[0.08, 0.05, 0.12]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color="#ff0000" />
        </mesh>
      </mesh>
      
      {/* Body */}
      <mesh ref={bodyRef} position={[0, 0, 0]}>
        <boxGeometry args={[0.4, 0.8, 0.2]} />
        <meshStandardMaterial color="#654321" roughness={0.8} />
      </mesh>
      
      {/* Legs */}
      <mesh position={[-0.1, -0.8, 0]}>
        <boxGeometry args={[0.12, 0.6, 0.12]} />
        <meshStandardMaterial color="#2F4F4F" roughness={0.9} />
      </mesh>
      <mesh position={[0.1, -0.8, 0]}>
        <boxGeometry args={[0.12, 0.6, 0.12]} />
        <meshStandardMaterial color="#2F4F4F" roughness={0.9} />
      </mesh>
    </group>
  );
} 