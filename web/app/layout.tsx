import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mini-Discord',
  description: 'Chat with friends',
  manifest: '/manifest.json',
  themeColor: '#5865f2',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');`
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
