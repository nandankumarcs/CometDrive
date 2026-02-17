//@ts-check

const { composePlugins, withNx } = require('@nx/next');

const rawApiUrl = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001/api';
const normalizedApiUrl = rawApiUrl.replace(/\/+$/, '');
const apiV1Destination = normalizedApiUrl.endsWith('/api/v1')
  ? normalizedApiUrl
  : normalizedApiUrl.endsWith('/api')
  ? `${normalizedApiUrl}/v1`
  : `${normalizedApiUrl}/api/v1`;

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {},
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        // Proxy to backend API and keep URI versioning.
        destination: `${apiV1Destination}/:path*`,
      },
    ];
  },
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
