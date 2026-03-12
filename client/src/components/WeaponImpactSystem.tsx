import React, { useState, useEffect } from "react";
import * as THREE from "three";
import { BloodSplatter } from "./BloodSplatter";
import { FlyingLimbs } from "./FlyingLimbs";

interface ImpactEffect {
  id: string;
  position: THREE.Vector3;
  weaponType: 'pistol' | 'shotgun' | 'flamethrower' | 'rocket' | 'nuke';
  intensity: number;
  timestamp: number;
}

interface WeaponImpactSystemProps {
  impacts: ImpactEffect[];
  onEffectComplete?: (id: string) => void;
}

export function WeaponImpactSystem({ impacts, onEffectComplete }: WeaponImpactSystemProps) {
  const [activeEffects, setActiveEffects] = useState<ImpactEffect[]>([]);

  useEffect(() => {
    // Add new impacts to active effects
    const newEffects = impacts.filter(impact => 
      !activeEffects.find(active => active.id === impact.id)
    );
    
    if (newEffects.length > 0) {
      setActiveEffects(prev => [...prev, ...newEffects]);
    }
  }, [impacts, activeEffects]);

  const handleEffectComplete = (effectId: string) => {
    setActiveEffects(prev => prev.filter(effect => effect.id !== effectId));
    onEffectComplete?.(effectId);
  };

  return (
    <>
      {activeEffects.map(effect => (
        <WeaponImpactEffect 
          key={effect.id} 
          effect={effect} 
          onComplete={() => handleEffectComplete(effect.id)}
        />
      ))}
    </>
  );
}

function WeaponImpactEffect({ effect, onComplete }: { 
  effect: ImpactEffect; 
  onComplete: () => void;
}) {
  const [showBlood, setShowBlood] = useState(true);
  const [showLimbs, setShowLimbs] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);

  useEffect(() => {
    // Determine which effects to show based on weapon type
    const shouldShowLimbs = ['shotgun', 'rocket', 'nuke'].includes(effect.weaponType);
    const shouldShowExplosion = ['rocket', 'nuke'].includes(effect.weaponType);

    if (shouldShowLimbs) {
      setTimeout(() => setShowLimbs(true), 100);
    }
    
    if (shouldShowExplosion) {
      setTimeout(() => setShowExplosion(true), 50);
    }

    // Auto-cleanup after all effects complete
    const timeout = setTimeout(() => {
      onComplete();
    }, getEffectDuration(effect.weaponType));

    return () => clearTimeout(timeout);
  }, [effect, onComplete]);

  const getEffectDuration = (weaponType: string): number => {
    switch (weaponType) {
      case 'pistol': return 3000;
      case 'shotgun': return 5000;
      case 'flamethrower': return 4000;
      case 'rocket': return 8000;
      case 'nuke': return 12000;
      default: return 3000;
    }
  };

  const getBloodIntensity = (): number => {
    switch (effect.weaponType) {
      case 'pistol': return 0.5;
      case 'shotgun': return 1.5;
      case 'flamethrower': return 0.8;
      case 'rocket': return 2.0;
      case 'nuke': return 3.0;
      default: return 1.0;
    }
  };

  const getExplosionForce = (): number => {
    switch (effect.weaponType) {
      case 'shotgun': return 1.2;
      case 'rocket': return 2.5;
      case 'nuke': return 4.0;
      default: return 1.0;
    }
  };

  return (
    <>
      {/* Blood splatter effect */}
      {showBlood && (
        <BloodSplatter 
          position={effect.position}
          intensity={getBloodIntensity() * effect.intensity}
          onComplete={() => setShowBlood(false)}
        />
      )}
      
      {/* Flying limbs for powerful weapons */}
      {showLimbs && (
        <FlyingLimbs 
          position={effect.position}
          explosionForce={getExplosionForce() * effect.intensity}
          onComplete={() => setShowLimbs(false)}
        />
      )}
      
      {/* Explosion effect for rockets and nukes */}
      {showExplosion && (
        <ExplosionEffect 
          position={effect.position}
          weaponType={effect.weaponType}
          intensity={effect.intensity}
          onComplete={() => setShowExplosion(false)}
        />
      )}
    </>
  );
}

function ExplosionEffect({ 
  position, 
  weaponType, 
  intensity, 
  onComplete 
}: { 
  position: THREE.Vector3; 
  weaponType: string; 
  intensity: number;
  onComplete: () => void;
}) {
  useEffect(() => {
    const duration = weaponType === 'nuke' ? 6000 : 3000;
    const timeout = setTimeout(onComplete, duration);
    return () => clearTimeout(timeout);
  }, [weaponType, onComplete]);

  const getExplosionColor = () => {
    switch (weaponType) {
      case 'rocket': return '#FF4500';
      case 'nuke': return '#00FF00';
      default: return '#FF6600';
    }
  };

  const getExplosionSize = () => {
    switch (weaponType) {
      case 'rocket': return 2 * intensity;
      case 'nuke': return 5 * intensity;
      default: return 1 * intensity;
    }
  };

  return (
    <group position={position}>
      {/* Main explosion sphere */}
      <mesh>
        <sphereGeometry args={[getExplosionSize(), 16, 16]} />
        <meshBasicMaterial 
          color={getExplosionColor()} 
          transparent 
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Outer shockwave */}
      <mesh scale={[2, 2, 2]}>
        <sphereGeometry args={[getExplosionSize(), 12, 12]} />
        <meshBasicMaterial 
          color={getExplosionColor()} 
          transparent 
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Nuclear glow for nuke */}
      {weaponType === 'nuke' && (
        <mesh scale={[4, 4, 4]}>
          <sphereGeometry args={[getExplosionSize(), 8, 8]} />
          <meshBasicMaterial 
            color="#00FF00" 
            transparent 
            opacity={0.1}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}