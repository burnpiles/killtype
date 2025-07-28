import { useTexture } from "@react-three/drei";

export function Environment() {
  const grassTexture = useTexture("/textures/grass.png");
  
  // Configure texture repeat
  grassTexture.wrapS = grassTexture.wrapT = 1000; // RepeatWrapping
  grassTexture.repeat.set(20, 20);

  return (
    <>
      {/* Ground plane */}
      <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshLambertMaterial map={grassTexture} />
      </mesh>
      
      {/* Simple barriers/walls around the play area */}
      <mesh position={[-15, 0, 0]} castShadow>
        <boxGeometry args={[1, 4, 30]} />
        <meshLambertMaterial color="#333333" />
      </mesh>
      <mesh position={[15, 0, 0]} castShadow>
        <boxGeometry args={[1, 4, 30]} />
        <meshLambertMaterial color="#333333" />
      </mesh>
      <mesh position={[0, 0, -15]} castShadow>
        <boxGeometry args={[30, 4, 1]} />
        <meshLambertMaterial color="#333333" />
      </mesh>
    </>
  );
}
