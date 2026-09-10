   /** @type {import('next').NextConfig} */
   const nextConfig = {
     reactStrictMode: true,
     images: { remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }] },
     // เพิ่มส่วนนี้เข้าไปครับ
     typescript: {
       ignoreBuildErrors: true,
     },
     async headers() {
       return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] }];
     },
   };
   export default nextConfig;