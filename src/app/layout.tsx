
import type { Metadata, Viewport } from 'next';
import './globals.css';
import AppNav from '@/components/AppNav';

export const metadata: Metadata = {
  title: 'เหมียวปิ้ง แซนวิช',
  description: 'ระบบจัดการต้นทุน สต็อก และกำไร สำหรับร้านแซนวิชเดลิเวอรี่',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'เหมียวปิ้ง แซนวิช' },
  icons: {
  icon: [{ url: '/logo-icon.png', sizes: '512x512', type: 'image/png' }],
  apple: [{ url: '/logo-icon.png', sizes: '512x512', type: 'image/png' }],
},

 
};

export const viewport: Viewport = {
  themeColor: '#c2410c',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.theme==='dark'||(!('theme'in localStorage)&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}
              if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}`,
          }}
        />
      </head>
      <body>
        <AppNav /> 
        {children}
        </body>
    </html>
  );
}