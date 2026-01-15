export function Footer() {
    return (
        <footer className="w-full py-6 mt-auto border-t border-white/5 bg-black/20 backdrop-blur-sm">
            <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
                <p>&copy; {new Date().getFullYear()} UltimSite. Tüm hakları saklıdır.</p>
                <p className="mt-1 text-xs">Hız ve yaratıcılık için tasarlandı.</p>
            </div>
        </footer>
    );
}
