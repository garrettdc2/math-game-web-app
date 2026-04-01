/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Required for Three.js WebGPU renderer compatibility
    config.externals = [...(config.externals || []), { canvas: "canvas" }];

    // Handle WGSL shader files for WebGPU
    config.module.rules.push({
      test: /\.wgsl$/,
      type: "asset/source",
    });

    return config;
  },
  images: {
    unoptimized: false,
  },
};

export default nextConfig;
