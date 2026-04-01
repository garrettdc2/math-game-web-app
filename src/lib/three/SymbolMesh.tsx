'use client';

import { useRef, useState, useMemo } from 'react';
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
  const [currentScale, setCurrentScale] = useState(1);

  // Gentle floating animation + hover scale
  useFrame((state, delta) => {
    const targetScale = hovered ? 1.15 : 1;
    setCurrentScale((prev) => THREE.MathUtils.lerp(prev, targetScale, delta * 8));

    if (meshRef.current) {
      meshRef.current.scale.setScalar(currentScale * scale);
      // Subtle float
      meshRef.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  const displaySymbol = SYMBOL_MAP[value] ?? value;

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        metalness: 0.5,
        roughness: 0.3,
        emissive: new THREE.Color(color).multiplyScalar(hovered ? 0.4 : 0.15),
      }),
    [color, hovered]
  );

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
          material={material}
        >
          {displaySymbol}
        </Text3D>
      </Center>
    </group>
  );
}
