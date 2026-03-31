'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import type { Group, Mesh } from 'three';

function AnimatedCore() {
  const groupRef = useRef<Group | null>(null);
  const knotRef = useRef<Mesh | null>(null);
  const ringARef = useRef<Mesh | null>(null);
  const ringBRef = useRef<Mesh | null>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.22;
    }
    if (knotRef.current) {
      knotRef.current.rotation.x = time * 0.45;
      knotRef.current.rotation.z = time * 0.25;
    }
    if (ringARef.current) {
      ringARef.current.rotation.x = time * 0.28;
      ringARef.current.rotation.y = time * 0.16;
    }
    if (ringBRef.current) {
      ringBRef.current.rotation.y = -time * 0.22;
      ringBRef.current.rotation.z = time * 0.18;
    }
  });

  const accentPositions = useMemo(
    () => [
      [-1.8, 1.2, -0.8],
      [1.7, -1.1, 0.4],
      [0.5, 1.8, 0.2]
    ],
    []
  );

  return (
    <group ref={groupRef}>
      <Float speed={1.8} rotationIntensity={0.7} floatIntensity={1.1}>
        <mesh ref={knotRef} position={[0, 0, 0]}>
          <torusKnotGeometry args={[0.9, 0.26, 220, 36]} />
          <meshStandardMaterial color="#ef4444" metalness={0.55} roughness={0.2} />
        </mesh>
      </Float>

      <mesh ref={ringARef} rotation={[0.8, 0.2, 0]}>
        <torusGeometry args={[1.7, 0.06, 24, 160]} />
        <meshStandardMaterial color="#f59e0b" transparent opacity={0.55} />
      </mesh>

      <mesh ref={ringBRef} rotation={[-0.4, 0.5, 0.9]}>
        <torusGeometry args={[2.15, 0.05, 24, 160]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.48} />
      </mesh>

      {accentPositions.map((position, index) => (
        <Float key={position.join('-')} speed={1.5 + index * 0.3} rotationIntensity={0.6} floatIntensity={1.6}>
          <mesh position={position as [number, number, number]}>
            <icosahedronGeometry args={[0.18 + index * 0.03, 0]} />
            <meshStandardMaterial color={index === 1 ? '#22c55e' : '#f8fafc'} metalness={0.4} roughness={0.28} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

export function LandingHeroScene() {
  return (
    <div className="hero-scene-shell" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 5.6], fov: 45 }} dpr={[1, 1.8]}>
        <color attach="background" args={['#0b1220']} />
        <ambientLight intensity={1.25} />
        <directionalLight position={[4, 3, 5]} intensity={2.5} color="#ffffff" />
        <pointLight position={[-3, -2, 4]} intensity={1.8} color="#ef4444" />
        <pointLight position={[3, 2, 3]} intensity={1.2} color="#38bdf8" />
        <AnimatedCore />
        <Sparkles count={50} size={2.6} scale={[6, 6, 6]} speed={0.45} color="#f8fafc" />
      </Canvas>
    </div>
  );
}
