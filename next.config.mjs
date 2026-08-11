/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ไม่ cache หน้า dynamic ฝั่ง client → ตัวเลข (dashboard/การจอง) สดใหม่ทุกครั้งที่เปลี่ยนหน้า
  experimental: {
    staleTimes: { dynamic: 0, static: 0 },
  },
};

export default nextConfig;
