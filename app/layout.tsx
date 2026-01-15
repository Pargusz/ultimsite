import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/ui/navbar';
import { Footer } from '@/components/ui/footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'UltimSite - Çevir & İndir',
  description: 'Dosya dönüştürme ve YouTube indirme için en iyi araç.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        <main className="min-h-screen pt-24 pb-12 px-4">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
