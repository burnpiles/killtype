import { Html } from "@react-three/drei";
import * as THREE from "three";

interface WordPromptProps {
  word: string;
  position: THREE.Vector3;
  isTargeted: boolean;
  currentIndex: number;
  isCompleted: boolean;
}

export function WordPrompt({ word, position, isTargeted, currentIndex, isCompleted }: WordPromptProps) {
  if (isCompleted) return null;

  return (
    <Html
      position={[position.x, position.y + 2.5, position.z]}
      center
      style={{ pointerEvents: 'none' }}
    >
      <div style={{
        backgroundColor: isTargeted ? 'rgba(255, 255, 0, 0.9)' : 'rgba(0, 0, 0, 0.8)',
        color: isTargeted ? 'black' : 'white',
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '18px',
        fontFamily: 'monospace',
        fontWeight: 'bold',
        border: isTargeted ? '3px solid #ffff00' : '2px solid #666666',
        boxShadow: isTargeted ? '0 0 20px #ffff00' : '0 0 10px rgba(0,0,0,0.5)',
        minWidth: '120px',
        textAlign: 'center',
        animation: isTargeted ? 'pulse 0.5s ease-in-out infinite alternate' : 'none',
        transform: 'translateY(-50%)'
      }}>
        {word.split('').map((char, index) => (
          <span
            key={index}
            style={{
              color: index < currentIndex 
                ? (isTargeted ? '#008800' : '#00ff00')
                : index === currentIndex 
                  ? (isTargeted ? '#880000' : '#ff0000')
                  : (isTargeted ? 'black' : 'white'),
              backgroundColor: index === currentIndex 
                ? (isTargeted ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 255, 0, 0.3)')
                : 'transparent',
              textDecoration: index < currentIndex ? 'line-through' : 'none',
              fontWeight: index === currentIndex ? 'bolder' : 'bold'
            }}
          >
            {char}
          </span>
        ))}
        
        {/* Progress indicator */}
        <div style={{
          marginTop: '4px',
          height: '3px',
          backgroundColor: isTargeted ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${(currentIndex / word.length) * 100}%`,
            backgroundColor: isTargeted ? '#008800' : '#00ff00',
            transition: 'width 0.1s'
          }} />
        </div>
      </div>
    </Html>
  );
}