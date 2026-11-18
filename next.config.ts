import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@opensearch-project/opensearch', 'kafkajs'],
  // Render consulta /health; la ruta real vive en /api/health
  async rewrites() {
    return [{ source: '/health', destination: '/api/health' }];
  },
};

export default nextConfig;
