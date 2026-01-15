'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileInput, Youtube, ArrowRight } from 'lucide-react';

export default function Home() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-12 text-center">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6 max-w-4xl"
      >
        <motion.h1
          variants={item}
          className="text-6xl md:text-8xl font-bold tracking-tight"
        >
          <span className="bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-white/50">
            Hepsi Bir Arada
          </span>
          <br />
          <span className="text-gradient">
            Dijital Araç Seti
          </span>
        </motion.h1>

        <motion.p
          variants={item}
          className="text-xl text-muted-foreground max-w-2xl mx-auto"
        >
          Güçlü ve gizlilik odaklı araçlarımızla dosyalarınızı dönüştürün ve favori içeriklerinizi indirin.
        </motion.p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid md:grid-cols-2 gap-6 w-full max-w-4xl"
      >
        <motion.div variants={item}>
          <Link href="/converter" className="group relative block p-1 h-full">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-indigo-500 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
            <div className="relative h-full glass-card p-8 rounded-3xl hover:bg-card/50 transition-colors flex flex-col items-center gap-4 border border-white/10 group-hover:border-white/20">
              <div className="p-4 rounded-full bg-gradient-to-br from-pink-500/20 to-indigo-500/20 text-pink-500 group-hover:scale-110 transition-transform duration-300">
                <FileInput size={48} />
              </div>
              <h2 className="text-2xl font-bold text-white">Dosya Dönüştürücü</h2>
              <p className="text-muted-foreground">PDF'leri, Resimleri ve daha fazlasını anında dönüştürün.</p>
              <div className="mt-auto flex items-center gap-2 text-primary font-medium">
                Hemen Dene <ArrowRight size={16} />
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/downloader" className="group relative block p-1 h-full">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
            <div className="relative h-full glass-card p-8 rounded-3xl hover:bg-card/50 transition-colors flex flex-col items-center gap-4 border border-white/10 group-hover:border-white/20">
              <div className="p-4 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 text-violet-500 group-hover:scale-110 transition-transform duration-300">
                <Youtube size={48} />
              </div>
              <h2 className="text-2xl font-bold text-white">Medya İndirici</h2>
              <p className="text-muted-foreground">YouTube ve diğer platformlardan video ve ses indirin.</p>
              <div className="mt-auto flex items-center gap-2 text-primary font-medium">
                Hemen Dene <ArrowRight size={16} />
              </div>
            </div>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
