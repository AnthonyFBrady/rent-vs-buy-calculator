/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/experience',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
