'use client';

import { useRef, useState, useMemo } from 'react';
import { Center, Text3D } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface NumberMeshProps {
  /** The numeric value to render as a 3D mesh */
  value: string;
  /** Position in 3D space [x, y, z] */
  position?: [number, number, number];
  /** Base color of the mesh */
  color?: string;
  /** Whether this mesh is interactive (draggable) */
  interactive?: boolean;
  /** Called when the mesh is clicked */
  onClick?: () => void;
  /** Scale multiplier */
  scale?: number;
}

/**
 * R3F component that renders a number as an extruded 3D text mesh.
 *
 * Uses @react-three/drei's Text3D with a built-in font. The mesh has a
 * gradient-like metallic material and subtle hover animation.
 */
export default function NumberMesh({
  value,
  position = [0, 0, 0],
  color = '#a855f7',
  interactive = true,
  onClick,
  scale = 1,
}: NumberMeshProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [currentScale, setCurrentScale] = useState(1);

  // Smooth hover scale animation
  useFrame((_, delta) => {
    const targetScale = hovered ? 1.1 : 1;
    setCurrentScale((prev) => THREE.MathUtils.lerp(prev, targetScale, delta * 8));

    if (meshRef.current) {
      meshRef.current.scale.setScalar(currentScale * scale);
    }
  });

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        metalness: 0.3,
        roughness: 0.4,
        emissive: new THREE.Color(color).multiplyScalar(hovered ? 0.3 : 0.1),
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
          document.body.style.cursor = 'pointer';
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
          size={0.8}
          height={0.2}
          curveSegments={12}
          bevelEnabled
          bevelThickness={0.02}
          bevelSize={0.02}
          bevelOffset={0}
          bevelSegments={5}
          material={material}
        >
          {value}
        </Text3D>
      </Center>
    </group>
  );
}
