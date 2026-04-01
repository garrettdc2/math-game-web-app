'use client';

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Center, Text3D } from '@react-three/drei';
import type { DisplayToken } from '@/lib/math/types';
import NumberMesh from '@/lib/three/NumberMesh';
import SymbolMesh from '@/lib/three/SymbolMesh';
import InteractionControls from '@/lib/three/InteractionControls';
import * as THREE from 'three';

interface ProblemDisplay3DProps {
  /** The display tokens to render as 3D objects */
  tokens: DisplayToken[];
  /** Whether the answer has been revealed (dims interaction) */
  answered?: boolean;
  /** Visual feedback state */
  feedback?: 'correct' | 'incorrect' | null;
}

/** Spacing between tokens along the x-axis in world units */
const TOKEN_SPACING = 2.0;

/**
 * Computes x-positions for tokens so they are centered around x=0.
 */
function getTokenPositions(count: number): number[] {
  const totalWidth = (count - 1) * TOKEN_SPACING;
  const startX = -totalWidth / 2;
  return Array.from({ length: count }, (_, i) => startX + i * TOKEN_SPACING);
}

/**
 * Returns the display text for a token, handling all token types.
 */
function getTokenDisplayValue(token: DisplayToken): string {
  switch (token.type) {
    case 'number':
    case 'symbol':
      return token.value;
    case 'fraction':
      return `${token.numerator}/${token.denominator}`;
    case 'exponent':
      return `${token.base}^${token.power}`;
    case 'sqrt':
      return `√${token.radicand}`;
  }
}

/**
 * Returns whether a token should be rendered as an operator (cyan) or number (purple).
 */
function isOperatorToken(token: DisplayToken): boolean {
  return token.type === 'symbol';
}

/**
 * Generate a stable key for a token based on its index and content.
 */
function tokenKey(token: DisplayToken, index: number): string {
  return `${index}-${token.type}-${getTokenDisplayValue(token)}`;
}

/**
 * Renders a fraction as stacked 3D text (numerator over denominator with a bar).
 */
function FractionMesh3D({
  numerator,
  denominator,
  position,
  color,
  interactive,
}: {
  numerator: string;
  denominator: string;
  position: [number, number, number];
  color: string;
  interactive: boolean;
}) {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        metalness: 0.3,
        roughness: 0.4,
        emissive: new THREE.Color(color).multiplyScalar(0.1),
      }),
    [color]
  );

  return (
    <group position={position}>
      {/* Numerator */}
      <Center position={[0, 0.5, 0]}>
        <Text3D
          font="/fonts/helvetiker_regular.typeface.json"
          size={0.5}
          height={0.1}
          curveSegments={8}
          bevelEnabled
          bevelThickness={0.01}
          bevelSize={0.01}
          material={material}
        >
          {numerator}
        </Text3D>
      </Center>

      {/* Fraction bar */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.2, 0.05, 0.1]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Denominator */}
      <Center position={[0, -0.5, 0]}>
        <Text3D
          font="/fonts/helvetiker_regular.typeface.json"
          size={0.5}
          height={0.1}
          curveSegments={8}
          bevelEnabled
          bevelThickness={0.01}
          bevelSize={0.01}
          material={material}
        >
          {denominator}
        </Text3D>
      </Center>
    </group>
  );
}

/**
 * Renders an exponent as base with superscript power in 3D.
 */
function ExponentMesh3D({
  base,
  power,
  position,
  color,
}: {
  base: string;
  power: string;
  position: [number, number, number];
  color: string;
}) {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        metalness: 0.3,
        roughness: 0.4,
        emissive: new THREE.Color(color).multiplyScalar(0.1),
      }),
    [color]
  );

  return (
    <group position={position}>
      <Center position={[0, 0, 0]}>
        <Text3D
          font="/fonts/helvetiker_regular.typeface.json"
          size={0.8}
          height={0.15}
          curveSegments={8}
          bevelEnabled
          bevelThickness={0.01}
          bevelSize={0.01}
          material={material}
        >
          {base}
        </Text3D>
      </Center>
      <Center position={[0.7, 0.5, 0]}>
        <Text3D
          font="/fonts/helvetiker_regular.typeface.json"
          size={0.4}
          height={0.1}
          curveSegments={8}
          bevelEnabled
          bevelThickness={0.01}
          bevelSize={0.01}
          material={material}
        >
          {power}
        </Text3D>
      </Center>
    </group>
  );
}

/**
 * Renders a sqrt token as √ symbol with radicand in 3D.
 */
function SqrtMesh3D({
  radicand,
  position,
  color,
}: {
  radicand: string;
  position: [number, number, number];
  color: string;
}) {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        metalness: 0.3,
        roughness: 0.4,
        emissive: new THREE.Color(color).multiplyScalar(0.1),
      }),
    [color]
  );

  return (
    <group position={position}>
      <Center>
        <Text3D
          font="/fonts/helvetiker_regular.typeface.json"
          size={0.8}
          height={0.15}
          curveSegments={8}
          bevelEnabled
          bevelThickness={0.01}
          bevelSize={0.01}
          material={material}
        >
          {`√${radicand}`}
        </Text3D>
      </Center>
    </group>
  );
}

/**
 * Renders a single DisplayToken as the appropriate 3D mesh, wrapped in
 * InteractionControls for drag/rotate.
 */
function TokenMesh({
  token,
  xPos,
  interactive,
  feedback,
}: {
  token: DisplayToken;
  xPos: number;
  interactive: boolean;
  feedback?: 'correct' | 'incorrect' | null;
}) {
  // Feedback-aware colors
  const numberColor = feedback === 'correct' ? '#4ade80' : feedback === 'incorrect' ? '#f87171' : '#a855f7';
  const operatorColor = feedback === 'correct' ? '#86efac' : feedback === 'incorrect' ? '#fca5a5' : '#22d3ee';

  return (
    <InteractionControls
      enableDrag={interactive}
      enableRotate={interactive}
      dragPlane="xy"
    >
      {token.type === 'symbol' ? (
        <SymbolMesh
          value={token.value}
          position={[xPos, 0, 0]}
          color={operatorColor}
          interactive={interactive}
        />
      ) : token.type === 'fraction' ? (
        <FractionMesh3D
          numerator={token.numerator}
          denominator={token.denominator}
          position={[xPos, 0, 0]}
          color={numberColor}
          interactive={interactive}
        />
      ) : token.type === 'exponent' ? (
        <ExponentMesh3D
          base={token.base}
          power={token.power}
          position={[xPos, 0, 0]}
          color={numberColor}
        />
      ) : token.type === 'sqrt' ? (
        <SqrtMesh3D
          radicand={token.radicand}
          position={[xPos, 0, 0]}
          color={numberColor}
        />
      ) : (
        <NumberMesh
          value={token.value}
          position={[xPos, 0, 0]}
          color={numberColor}
          interactive={interactive}
        />
      )}
    </InteractionControls>
  );
}

/**
 * Loading spinner shown inside the Canvas while assets (fonts, etc.) load.
 */
function LoadingIndicator() {
  return (
    <mesh>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial color="#a855f7" wireframe />
    </mesh>
  );
}

/**
 * ProblemDisplay3D — R3F Canvas scene that renders math problem tokens as
 * interactive 3D text meshes.
 *
 * Features:
 * - Extruded 3D numbers and operator symbols
 * - Special rendering for fractions (stacked), exponents (superscript), and square roots
 * - Drag and rotate interaction per token
 * - Orbit controls for the overall scene
 * - Responsive sizing via R3F's built-in resize handling
 * - Contact shadows and environment lighting for visual polish
 * - Feedback color changes (green for correct, red for incorrect)
 */
export default function ProblemDisplay3D({
  tokens,
  answered = false,
  feedback = null,
}: ProblemDisplay3DProps) {
  const positions = useMemo(() => getTokenPositions(tokens.length), [tokens.length]);

  return (
    <div className="relative h-[300px] w-full rounded-2xl bg-gray-950/80 sm:h-[400px]">
      <Canvas
        camera={{ position: [0, 2, 8], fov: 50 }}
        dpr={[1, 2]}
        style={{ borderRadius: '1rem' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
        <pointLight position={[-5, 3, -5]} intensity={0.3} color="#22d3ee" />

        {/* Environment for reflections */}
        <Environment preset="night" />

        {/* Contact shadows for grounding */}
        <ContactShadows
          position={[0, -1.2, 0]}
          opacity={0.4}
          scale={20}
          blur={2}
          far={4}
        />

        <Suspense fallback={<LoadingIndicator />}>
          {/* Render each token as a 3D mesh */}
          {tokens.map((token, i) => (
            <TokenMesh
              key={tokenKey(token, i)}
              token={token}
              xPos={positions[i]}
              interactive={!answered}
              feedback={feedback}
            />
          ))}
        </Suspense>

        {/* Orbit controls — limited to prevent disorienting rotations */}
        <OrbitControls
          enableZoom
          enablePan={false}
          minDistance={4}
          maxDistance={15}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 6}
          autoRotate={!answered && tokens.length > 0}
          autoRotateSpeed={0.5}
        />
      </Canvas>

      {/* Overlay gradient border glow */}
      <div
        className={`pointer-events-none absolute inset-0 rounded-2xl border transition-colors duration-300 ${
          feedback === 'correct'
            ? 'border-green-500/50 shadow-[0_0_30px_rgba(74,222,128,0.2)]'
            : feedback === 'incorrect'
              ? 'border-red-500/50 shadow-[0_0_30px_rgba(248,113,113,0.2)]'
              : 'border-white/10'
        }`}
      />
    </div>
  );
}
