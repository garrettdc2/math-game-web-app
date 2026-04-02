'use client';

import { useRef, useState, useEffect } from 'react';
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
  // Use a ref for the animated scale to avoid re-renders on every frame
  const currentScaleRef = useRef(1);
  // Use a ref for the material to avoid re-creating on hover
  const materialRef = useRef<THREE.MeshStandardMaterial>(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      metalness: 0.3,
      roughness: 0.4,
      emissive: new THREE.Color(color).multiplyScalar(0.1),
    })
  );

  // Update material color when the color prop changes (without re-creating)
  useEffect(() => {
    const mat = materialRef.current;
    mat.color.set(color);
    mat.emissive.set(color).multiplyScalar(hovered ? 0.3 : 0.1);
  }, [color, hovered]);

  // Dispose material on unmount to prevent GPU memory leak
  useEffect(() => {
    const mat = materialRef.current;
    return () => {
      mat.dispose();
    };
  }, []);

  // Smooth hover scale animation — mutate refs directly, no setState
  useFrame((_, delta) => {
    const targetScale = hovered ? 1.1 : 1;
    currentScaleRef.current = THREE.MathUtils.lerp(
      currentScaleRef.current,
      targetScale,
      delta * 8
    );

    if (meshRef.current) {
      meshRef.current.scale.setScalar(currentScaleRef.current * scale);
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
          material={materialRef.current}
        >
          {value}
        </Text3D>
      </Center>
    </group>
  );
}
