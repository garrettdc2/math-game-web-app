'use client';

import { useEffect, useState } from 'react';

export type RenderMode = 'webgpu' | 'webgl' | '2d';

interface WebGPUSupport {
  /** Whether the browser supports WebGPU */
  supportsWebGPU: boolean;
  /** Whether the browser supports WebGL 2 (or at least WebGL 1) */
  supportsWebGL: boolean;
  /** The best available render mode: webgpu > webgl > 2d */
  renderMode: RenderMode;
  /** True while detection is still running */
  loading: boolean;
}

/**
 * Detects browser support for WebGPU and WebGL, returning the best available
 * render mode for the 3D math game.
 *
 * Cascade:
 *   1. WebGPU (`navigator.gpu` + requestAdapter succeeds) → '3D via WebGPU'
 *   2. WebGL 2 / WebGL 1 (canvas getContext) → '3D via WebGL'
 *   3. Neither → '2D fallback'
 */
export function useWebGPU(): WebGPUSupport {
  const [state, setState] = useState<WebGPUSupport>({
    supportsWebGPU: false,
    supportsWebGL: false,
    renderMode: '2d',
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      let supportsWebGPU = false;
      let supportsWebGL = false;

      // --- WebGPU detection ---------------------------------------------------
      try {
        if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const gpu = (navigator as any).gpu;
          const adapter = await gpu.requestAdapter();
          if (adapter) {
            supportsWebGPU = true;
          }
        }
      } catch {
        // WebGPU not available
      }

      // --- WebGL detection ----------------------------------------------------
      try {
        if (typeof document !== 'undefined') {
          const canvas = document.createElement('canvas');
          const gl =
            canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (gl) {
            supportsWebGL = true;
          }
        }
      } catch {
        // WebGL not available
      }

      // --- Determine best render mode -----------------------------------------
      let renderMode: RenderMode = '2d';
      if (supportsWebGPU) {
        renderMode = 'webgpu';
      } else if (supportsWebGL) {
        renderMode = 'webgl';
      }

      if (!cancelled) {
        setState({
          supportsWebGPU,
          supportsWebGL,
          renderMode,
          loading: false,
        });
      }
    }

    detect();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
