import { renderHook, waitFor } from '@testing-library/react';
import { useWebGPU } from '../useWebGPU';

describe('useWebGPU', () => {
  it('resolves with loading=false after detection', async () => {
    const { result } = renderHook(() => useWebGPU());
    // In jsdom, detection runs synchronously via microtask,
    // so by the time we check, loading may already be false
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('defaults to 2d renderMode in jsdom (no WebGPU, no real WebGL)', async () => {
    // Override canvas getContext to return null (jsdom default behavior)
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(null) as any;

    const { result } = renderHook(() => useWebGPU());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.renderMode).toBe('2d');
    expect(result.current.supportsWebGPU).toBe(false);
    expect(result.current.supportsWebGL).toBe(false);

    HTMLCanvasElement.prototype.getContext = origGetContext;
  });

  it('detects WebGL when canvas context is available', async () => {
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
      // Mock WebGL context
      getExtension: jest.fn(),
    }) as any;

    const { result } = renderHook(() => useWebGPU());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.supportsWebGL).toBe(true);
    expect(result.current.renderMode).toBe('webgl');

    HTMLCanvasElement.prototype.getContext = origGetContext;
  });

  it('detects WebGPU when navigator.gpu is available', async () => {
    Object.defineProperty(navigator, 'gpu', {
      value: {
        requestAdapter: jest.fn().mockResolvedValue({ name: 'mock-adapter' }),
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useWebGPU());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.supportsWebGPU).toBe(true);
    expect(result.current.renderMode).toBe('webgpu');

    // Clean up
    delete (navigator as any).gpu;
  });

  it('handles requestAdapter rejection gracefully', async () => {
    Object.defineProperty(navigator, 'gpu', {
      value: {
        requestAdapter: jest.fn().mockRejectedValue(new Error('GPU error')),
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useWebGPU());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.supportsWebGPU).toBe(false);

    delete (navigator as any).gpu;
  });

  it('handles requestAdapter returning null', async () => {
    Object.defineProperty(navigator, 'gpu', {
      value: {
        requestAdapter: jest.fn().mockResolvedValue(null),
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useWebGPU());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.supportsWebGPU).toBe(false);
    expect(result.current.renderMode).not.toBe('webgpu');

    delete (navigator as any).gpu;
  });
});
