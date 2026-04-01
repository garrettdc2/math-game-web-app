import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import Navbar from '@/components/shared/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MathQuest - Interactive Math Game for K-12',
  description:
    'An engaging, interactive math game aligned with Common Core standards for grades K through 12. Practice math skills with 3D visualizations, celebrations, and leaderboards.',
  keywords: ['math', 'game', 'education', 'K-12', 'Common Core', 'WebGPU', '3D'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} min-h-screen bg-gray-950 text-white antialiased`}
      >
        <AuthProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
