'use client';

import { useRef, useState, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface InteractionControlsProps {
  /** The children (meshes) this component wraps */
  children: React.ReactNode;
  /** Whether drag is enabled */
  enableDrag?: boolean;
  /** Whether rotation via orbit is enabled */
  enableRotate?: boolean;
  /** Constrain drag to a plane (default: 'xz') */
  dragPlane?: 'xy' | 'xz';
  /** Called when a drag starts */
  onDragStart?: () => void;
  /** Called when a drag ends */
  onDragEnd?: () => void;
  /** Called with new position during drag */
  onDrag?: (position: THREE.Vector3) => void;
}

/**
 * Wraps child R3F elements with drag-and-rotate interaction controls.
 *
 * Supports both mouse and touch input. Drag moves the group along a plane
 * in world space. Hover highlights and cursor changes provide visual feedback.
 */
export default function InteractionControls({
  children,
  enableDrag = true,
  enableRotate = true,
  dragPlane = 'xz',
  onDragStart,
  onDragEnd,
  onDrag,
}: InteractionControlsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();

  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dragOffset = useRef(new THREE.Vector3());
  const plane = useRef(
    new THREE.Plane(
      dragPlane === 'xy'
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3(0, 1, 0),
      0
    )
  );

  // Auto-rotation when not interacting
  useFrame((_, delta) => {
    if (groupRef.current && enableRotate && !isDragging && !isHovered) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  const getIntersectionPoint = useCallback(
    (event: { point: THREE.Vector3; ray: THREE.Ray }) => {
      const intersection = new THREE.Vector3();
      event.ray.intersectPlane(plane.current, intersection);
      return intersection;
    },
    []
  );

  const handlePointerDown = useCallback(
    (event: { stopPropagation: () => void; point: THREE.Vector3; ray: THREE.Ray }) => {
      if (!enableDrag || !groupRef.current) return;

      event.stopPropagation();
      setIsDragging(true);

      // Update the drag plane to pass through the current object position
      const normal = dragPlane === 'xy'
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3(0, 1, 0);
      plane.current.setFromNormalAndCoplanarPoint(
        normal,
        groupRef.current.position
      );

      const intersection = getIntersectionPoint(event);
      dragOffset.current.copy(groupRef.current.position).sub(intersection);

      gl.domElement.style.cursor = 'grabbing';
      onDragStart?.();

      // Capture pointer for reliable drag
      (event as unknown as PointerEvent).target &&
        ((event as unknown as PointerEvent).target as HTMLElement).setPointerCapture?.(
          (event as unknown as PointerEvent).pointerId
        );
    },
    [enableDrag, dragPlane, getIntersectionPoint, gl.domElement, onDragStart]
  );

  const handlePointerMove = useCallback(
    (event: { stopPropagation: () => void; ray: THREE.Ray; point: THREE.Vector3 }) => {
      if (!isDragging || !groupRef.current) return;

      event.stopPropagation();

      const intersection = getIntersectionPoint(event);
      const newPos = intersection.add(dragOffset.current);

      groupRef.current.position.copy(newPos);
      onDrag?.(newPos);
    },
    [isDragging, getIntersectionPoint, onDrag]
  );

  const handlePointerUp = useCallback(
    (event: { stopPropagation: () => void }) => {
      if (!isDragging) return;
      event.stopPropagation();
      setIsDragging(false);
      gl.domElement.style.cursor = isHovered ? 'grab' : 'auto';
      onDragEnd?.();
    },
    [isDragging, isHovered, gl.domElement, onDragEnd]
  );

  return (
    <group
      ref={groupRef}
      onPointerDown={handlePointerDown as unknown as (event: THREE.Event) => void}
      onPointerMove={handlePointerMove as unknown as (event: THREE.Event) => void}
      onPointerUp={handlePointerUp as unknown as (event: THREE.Event) => void}
      onPointerOver={(e) => {
        e.stopPropagation();
        setIsHovered(true);
        if (!isDragging) {
          gl.domElement.style.cursor = 'grab';
        }
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setIsHovered(false);
        if (!isDragging) {
          gl.domElement.style.cursor = 'auto';
        }
      }}
    >
      {children}
    </group>
  );
}
