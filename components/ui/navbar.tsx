'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileInput, Youtube } from 'lucide-react';

export function Navbar() {
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
      <div className="max-w-7xl mx-auto glass rounded-2xl px-6 py-3 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
          UltimSite
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/converter" className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
            <FileInput size={18} />
            Dönüştürücü
          </Link>
          <Link href="/downloader" className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
            <Youtube size={18} />
            İndirici
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
