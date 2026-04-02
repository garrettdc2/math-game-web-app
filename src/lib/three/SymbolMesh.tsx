'use client';

import { useRef, useState, useEffect } from 'react';
import { Center, Text3D } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SymbolMeshProps {
  /** The operator symbol to render (e.g. "+", "−", "×", "÷", "=") */
  value: string;
  /** Position in 3D space [x, y, z] */
  position?: [number, number, number];
  /** Base color of the mesh */
  color?: string;
  /** Whether this mesh is interactive */
  interactive?: boolean;
  /** Called when the mesh is clicked */
  onClick?: () => void;
  /** Scale multiplier */
  scale?: number;
}

/** Mapping from internal operation symbols to display-friendly characters */
const SYMBOL_MAP: Record<string, string> = {
  '+': '+',
  '-': '−',
  '−': '−',
  '*': '×',
  '×': '×',
  '/': '÷',
  '÷': '÷',
  '=': '=',
  '?': '?',
  x: 'x',
  '^': '^',
  '(': '(',
  ')': ')',
  '√': '√',
};

/**
 * R3F component that renders a math operator symbol as an extruded 3D text mesh.
 *
 * Uses a slightly different material than NumberMesh (cyan accent) to visually
 * distinguish operators from operands.
 */
export default function SymbolMesh({
  value,
  position = [0, 0, 0],
  color = '#22d3ee',
  interactive = true,
  onClick,
  scale = 1,
}: SymbolMeshProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  // Use a ref for the animated scale to avoid re-renders on every frame
  const currentScaleRef = useRef(1);
  // Use a ref for the material to avoid re-creating on hover
  const materialRef = useRef<THREE.MeshStandardMaterial>(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      metalness: 0.5,
      roughness: 0.3,
      emissive: new THREE.Color(color).multiplyScalar(0.15),
    })
  );

  // Update material properties when color or hover state changes (no re-creation)
  useEffect(() => {
    const mat = materialRef.current;
    mat.color.set(color);
    mat.emissive.set(color).multiplyScalar(hovered ? 0.4 : 0.15);
  }, [color, hovered]);

  // Dispose material on unmount to prevent GPU memory leak
  useEffect(() => {
    const mat = materialRef.current;
    return () => {
      mat.dispose();
    };
  }, []);

  const displaySymbol = SYMBOL_MAP[value] ?? value;

  // Gentle floating animation + hover scale — mutate refs directly, no setState
  useFrame((state, delta) => {
    const targetScale = hovered ? 1.15 : 1;
    currentScaleRef.current = THREE.MathUtils.lerp(
      currentScaleRef.current,
      targetScale,
      delta * 8
    );

    if (meshRef.current) {
      meshRef.current.scale.setScalar(currentScaleRef.current * scale);
      // Subtle float
      meshRef.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <group
      ref={meshRef}
      position={position}
      onClick={(e) => {
        if (interactive && onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      onPointerOver={(e) => {
        if (interactive) {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'grab';
        }
      }}
      onPointerOut={() => {
        if (interactive) {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }
      }}
    >
      <Center>
        <Text3D
          font="/fonts/helvetiker_regular.typeface.json"
          size={0.7}
          height={0.15}
          curveSegments={12}
          bevelEnabled
          bevelThickness={0.01}
          bevelSize={0.01}
          bevelOffset={0}
          bevelSegments={3}
          material={materialRef.current}
        >
          {displaySymbol}
        </Text3D>
      </Center>
    </group>
  );
}
