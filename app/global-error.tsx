'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center bg-white text-black">
                    <h2 className="text-3xl font-bold text-red-600 mb-4">Kritik Hata (Global)</h2>
                    <div className="bg-gray-100 p-6 rounded-md mb-6 max-w-2xl text-left border border-gray-300">
                        <p className="font-mono text-base text-red-600 break-words">{error.message}</p>
                        {error.digest && <p className="text-sm text-gray-600 mt-2">Error ID: {error.digest}</p>}
                    </div>
                    <button
                        onClick={() => reset()}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                    >
                        Sayfayı Yenile
                    </button>
                </div>
            </body>
        </html>
    );
}
