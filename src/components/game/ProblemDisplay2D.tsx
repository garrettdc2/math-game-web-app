'use client';

import { useRef, useEffect } from 'react';
import type { DisplayToken } from '@/lib/math/types';

interface ProblemDisplay2DProps {
  /** The display tokens to render */
  tokens: DisplayToken[];
  /** Whether the answer has been revealed */
  answered?: boolean;
  /** Visual feedback state */
  feedback?: 'correct' | 'incorrect' | null;
}

/** Maps internal operator values to display-friendly characters */
function mapSymbol(value: string): string {
  const map: Record<string, string> = {
    '+': '+',
    '-': '−',
    '−': '−',
    '*': '×',
    '×': '×',
    '/': '÷',
    '÷': '÷',
    '=': '=',
    '?': '?',
  };
  return map[value] ?? value;
}

/**
 * Renders a number token as a styled badge.
 */
function NumberToken2D({
  value,
  feedback,
  interactive,
}: {
  value: string;
  feedback?: 'correct' | 'incorrect' | null;
  interactive: boolean;
}) {
  const colors =
    feedback === 'correct'
      ? 'from-green-400 to-green-300'
      : feedback === 'incorrect'
        ? 'from-red-400 to-red-300'
        : 'from-purple-400 to-purple-300';

  return (
    <span
      className={`
        inline-flex items-center justify-center
        rounded-xl bg-gradient-to-br px-4 py-2
        font-mono text-3xl font-bold text-gray-950
        shadow-lg transition-all duration-200
        sm:px-6 sm:py-3 sm:text-5xl
        ${colors}
        ${interactive ? 'cursor-grab hover:scale-110 hover:shadow-xl active:cursor-grabbing active:scale-95' : ''}
      `}
      style={{ minWidth: '3rem', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
    >
      {value}
    </span>
  );
}

/**
 * Renders a symbol/operator token as a styled badge.
 */
function SymbolToken2D({
  value,
  feedback,
  interactive,
}: {
  value: string;
  feedback?: 'correct' | 'incorrect' | null;
  interactive: boolean;
}) {
  const colors =
    feedback === 'correct'
      ? 'from-green-300 to-green-200'
      : feedback === 'incorrect'
        ? 'from-red-300 to-red-200'
        : 'from-cyan-400 to-cyan-300';

  return (
    <span
      className={`
        inline-flex items-center justify-center
        rounded-xl bg-gradient-to-br px-4 py-2
        font-mono text-3xl font-bold text-gray-950
        shadow-lg transition-all duration-200
        sm:px-6 sm:py-3 sm:text-5xl
        ${colors}
        ${interactive ? 'cursor-grab hover:scale-110 hover:shadow-xl active:cursor-grabbing active:scale-95' : ''}
      `}
      style={{ minWidth: '2.5rem', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
    >
      {mapSymbol(value)}
    </span>
  );
}

/**
 * Renders a fraction token as stacked numerator/denominator with a horizontal bar.
 */
function FractionToken2D({
  numerator,
  denominator,
  feedback,
  interactive,
}: {
  numerator: string;
  denominator: string;
  feedback?: 'correct' | 'incorrect' | null;
  interactive: boolean;
}) {
  const colors =
    feedback === 'correct'
      ? 'from-green-400 to-green-300'
      : feedback === 'incorrect'
        ? 'from-red-400 to-red-300'
        : 'from-purple-400 to-purple-300';

  return (
    <span
      className={`
        inline-flex flex-col items-center justify-center
        rounded-xl bg-gradient-to-br px-3 py-1.5
        font-mono font-bold text-gray-950
        shadow-lg transition-all duration-200
        sm:px-5 sm:py-2
        ${colors}
        ${interactive ? 'cursor-grab hover:scale-110 hover:shadow-xl active:cursor-grabbing active:scale-95' : ''}
      `}
    >
      <span className="text-xl sm:text-3xl">{numerator}</span>
      <span className="my-0.5 h-0.5 w-full bg-gray-950/60" />
      <span className="text-xl sm:text-3xl">{denominator}</span>
    </span>
  );
}

/**
 * Renders an exponent token as base with superscript power.
 */
function ExponentToken2D({
  base,
  power,
  feedback,
  interactive,
}: {
  base: string;
  power: string;
  feedback?: 'correct' | 'incorrect' | null;
  interactive: boolean;
}) {
  const colors =
    feedback === 'correct'
      ? 'from-green-400 to-green-300'
      : feedback === 'incorrect'
        ? 'from-red-400 to-red-300'
        : 'from-purple-400 to-purple-300';

  return (
    <span
      className={`
        inline-flex items-start justify-center
        rounded-xl bg-gradient-to-br px-4 py-2
        font-mono font-bold text-gray-950
        shadow-lg transition-all duration-200
        sm:px-6 sm:py-3
        ${colors}
        ${interactive ? 'cursor-grab hover:scale-110 hover:shadow-xl active:cursor-grabbing active:scale-95' : ''}
      `}
    >
      <span className="text-3xl sm:text-5xl">{base}</span>
      <span className="relative -top-1 text-lg sm:-top-2 sm:text-2xl">{power}</span>
    </span>
  );
}

/**
 * Renders a square root token.
 */
function SqrtToken2D({
  radicand,
  feedback,
  interactive,
}: {
  radicand: string;
  feedback?: 'correct' | 'incorrect' | null;
  interactive: boolean;
}) {
  const colors =
    feedback === 'correct'
      ? 'from-green-400 to-green-300'
      : feedback === 'incorrect'
        ? 'from-red-400 to-red-300'
        : 'from-purple-400 to-purple-300';

  return (
    <span
      className={`
        inline-flex items-center justify-center
        rounded-xl bg-gradient-to-br px-4 py-2
        font-mono text-3xl font-bold text-gray-950
        shadow-lg transition-all duration-200
        sm:px-6 sm:py-3 sm:text-5xl
        ${colors}
        ${interactive ? 'cursor-grab hover:scale-110 hover:shadow-xl active:cursor-grabbing active:scale-95' : ''}
      `}
    >
      √<span className="border-t-2 border-gray-950/60 px-1">{radicand}</span>
    </span>
  );
}

/**
 * Renders the correct 2D component for a given DisplayToken.
 */
function Token2D({
  token,
  feedback,
  interactive,
}: {
  token: DisplayToken;
  feedback?: 'correct' | 'incorrect' | null;
  interactive: boolean;
}) {
  switch (token.type) {
    case 'number':
      return <NumberToken2D value={token.value} feedback={feedback} interactive={interactive} />;
    case 'symbol':
      return <SymbolToken2D value={token.value} feedback={feedback} interactive={interactive} />;
    case 'fraction':
      return (
        <FractionToken2D
          numerator={token.numerator}
          denominator={token.denominator}
          feedback={feedback}
          interactive={interactive}
        />
      );
    case 'exponent':
      return (
        <ExponentToken2D
          base={token.base}
          power={token.power}
          feedback={feedback}
          interactive={interactive}
        />
      );
    case 'sqrt':
      return <SqrtToken2D radicand={token.radicand} feedback={feedback} interactive={interactive} />;
  }
}

/**
 * Generate a stable key for a token.
 */
function tokenKey(token: DisplayToken, index: number): string {
  switch (token.type) {
    case 'number':
    case 'symbol':
      return `${index}-${token.type}-${token.value}`;
    case 'fraction':
      return `${index}-frac-${token.numerator}-${token.denominator}`;
    case 'exponent':
      return `${index}-exp-${token.base}-${token.power}`;
    case 'sqrt':
      return `${index}-sqrt-${token.radicand}`;
  }
}

/**
 * Animated floating particles rendered on a Canvas element for visual interest
 * in the 2D fallback mode.
 */
function ParticleBackground({ feedback }: { feedback?: 'correct' | 'incorrect' | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    // Particle system
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      hue: number;
    }> = [];

    const PARTICLE_COUNT = 30;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.3 + 0.1,
        hue: feedback === 'correct' ? 140 : feedback === 'incorrect' ? 0 : Math.random() > 0.5 ? 270 : 190,
      });
    }

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.offsetWidth;
        if (p.x > canvas.offsetWidth) p.x = 0;
        if (p.y < 0) p.y = canvas.offsetHeight;
        if (p.y > canvas.offsetHeight) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${p.opacity})`;
        ctx.fill();
      }

      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [feedback]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ pointerEvents: 'none' }}
    />
  );
}

/**
 * ProblemDisplay2D — Graceful 2D fallback renderer for browsers that don't
 * support WebGPU or WebGL.
 *
 * Renders math problem tokens as styled HTML elements with:
 * - Gradient-colored token badges
 * - Special rendering for fractions (stacked), exponents (superscript), and square roots
 * - Hover/active animations (scale, shadow)
 * - Animated Canvas particle background for visual interest
 * - Feedback color changes (green for correct, red for incorrect)
 * - Responsive sizing for mobile and desktop
 *
 * All gameplay features remain fully functional — only the 3D presentation
 * is replaced.
 */
export default function ProblemDisplay2D({
  tokens,
  answered = false,
  feedback = null,
}: ProblemDisplay2DProps) {
  return (
    <div
      className={`relative flex h-[300px] w-full items-center justify-center overflow-hidden rounded-2xl bg-gray-950/80 sm:h-[400px] ${
        feedback === 'correct'
          ? 'ring-2 ring-green-500/50 shadow-[0_0_30px_rgba(74,222,128,0.2)]'
          : feedback === 'incorrect'
            ? 'ring-2 ring-red-500/50 shadow-[0_0_30px_rgba(248,113,113,0.2)]'
            : 'ring-1 ring-white/10'
      }`}
    >
      {/* Animated particle background */}
      <ParticleBackground feedback={feedback} />

      {/* Token display */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 px-4 sm:gap-4">
        {tokens.map((token, i) => (
          <Token2D
            key={tokenKey(token, i)}
            token={token}
            feedback={feedback}
            interactive={!answered}
          />
        ))}
      </div>

      {/* Subtle gradient overlay for depth */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-950/30" />
    </div>
  );
}
