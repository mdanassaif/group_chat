/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['avatars.dicebear.com', 'pixabay.com'],  
  },
  eslint: {
      ignoreDuringBuilds: true,
  },
  
};

export default nextConfig;
