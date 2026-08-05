/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // QR image & avatar dari Sakurupiah / Supabase Storage
      { protocol: 'https', hostname: 'sakurupiah.id' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.nip.io' }
    ]
  }
};

module.exports = nextConfig;
