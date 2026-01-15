'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Check, Loader2, Download, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';


export default function ConverterPage() {
    const [file, setFile] = useState<File | null>(null);
    const [converting, setConverting] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [targetFormat, setTargetFormat] = useState('png');
    const [customFilename, setCustomFilename] = useState('donusturulen');
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFile(acceptedFiles[0]);
        setDownloadUrl(null);
        setError(null);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxFiles: 1,
        accept: {
            'application/pdf': ['.pdf'],
            'image/*': ['.png', '.jpg', '.jpeg', '.webp']
        }
    });

    const convertPdfToImage = async (file: File, format: 'png' | 'jpg' | 'webp') => {
        // Dynamic import
        const pdfjsLib = await import('pdfjs-dist');
        const JSZip = (await import('jszip')).default;

        // Configure worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;

        if (totalPages === 0) throw new Error('PDF boş');

        const images: { blob: Blob, name: string }[] = [];

        // Loop through all pages
        for (let i = 1; i <= totalPages; i++) {
            const page = await pdf.getPage(i);
            const scale = 2.0;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext('2d');

            if (!context) throw new Error('Canvas context could not be created');

            await page.render({
                canvasContext: context,
                viewport: viewport,
            } as any).promise;

            const mimeType = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
            const ext = format;

            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((b) => {
                    if (b) resolve(b);
                    else reject(new Error(`Page ${i} conversion failed`));
                }, mimeType, 0.95);
            });

            images.push({ blob, name: `page_${i}.${ext}` });
        }

        // If single page, return image blob directly (or zip if consistency preferred, but standard is usually file)
        // User requested: "çoklu sayfalarda winrar olarak versin". Let's implicitly assume single page -> single file is fine, 
        // but if > 1 page -> ZIP.
        if (totalPages === 1) {
            return images[0].blob;
        }

        // If multiple pages, create ZIP
        const zip = new JSZip();
        images.forEach((img) => {
            zip.file(img.name, img.blob);
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        // We attach metadata to the blob so we can name it correctly later if needed, 
        // but here we return standard Blob. The caller needs to know if it's a zip or image.
        // We can handle the filename change in the caller.
        return Object.assign(zipBlob, { isZip: true, count: totalPages, format: format });
    };

    const convertImageToPdf = async (file: File) => {
        // Dynamic import
        const { PDFDocument } = await import('pdf-lib');

        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.create();

        let image;
        if (file.type === 'image/jpeg' || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) {
            image = await pdfDoc.embedJpg(arrayBuffer);
        } else {
            // For PNG and others, we might need to convert to PNG first if not supported directly,
            // but pdf-lib supports PNG. webp might need conversion.
            // If webp, we draw to canvas first then to PNG
            if (file.type === 'image/webp' || file.name.endsWith('.webp')) {
                const bitmap = await createImageBitmap(file);
                const canvas = document.createElement('canvas');
                canvas.width = bitmap.width;
                canvas.height = bitmap.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(bitmap, 0, 0);
                const pngBlob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
                if (!pngBlob) throw new Error('WEBP conversion failed');
                const pngBuffer = await pngBlob.arrayBuffer();
                image = await pdfDoc.embedPng(pngBuffer);
            } else {
                // Assume PNG
                image = await pdfDoc.embedPng(arrayBuffer);
            }
        }

        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
        });

        const pdfBytes = await pdfDoc.save();
        return new Blob([pdfBytes as any], { type: 'application/pdf' });
    };

    const convertImageToImage = async (file: File, format: 'png' | 'jpg' | 'webp') => {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext('2d');

        if (!context) throw new Error('Canvas context failed');
        context.drawImage(bitmap, 0, 0);

        const mimeType = format === 'jpg' ? 'image/jpeg' : `image/${format}`;

        return new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Conversion failed'));
            }, mimeType, 0.95);
        });
    };

    const handleConvert = async () => {
        if (!file) return;
        setConverting(true);
        setDownloadUrl(null);
        setError(null);

        try {
            let resultBlob: Blob;

            // PDF -> Image
            if (file.type === 'application/pdf' && ['png', 'jpg', 'webp'].includes(targetFormat)) {
                // Returns Blob or (Blob & { isZip: boolean, count: number, format: string })
                resultBlob = await convertPdfToImage(file, targetFormat as any);
                const resultAny = resultBlob as any;

                if (resultAny.isZip) {
                    // Custom filename for ZIP: ultimsite_dönüştürülmüş_resimler_[count]_[format].zip
                    const zipName = `ultimsite_donusturulmus_resimler_${resultAny.count}_${resultAny.format}.zip`;
                    // We need to store this filename state or force the download attribute update
                    // Since we use a simple <a> tag with `download={...}` state variable below, 
                    // we might need a separate state for filename.
                    setCustomFilename(zipName);
                } else {
                    setCustomFilename(`donusturulen.${targetFormat}`);
                }
            }
            // Image -> PDF
            else if (targetFormat === 'pdf') {
                resultBlob = await convertImageToPdf(file);
                setCustomFilename(`donusturulen.pdf`);
            }
            // Image -> Image
            else {
                resultBlob = await convertImageToImage(file, targetFormat as any);
                setCustomFilename(`donusturulen.${targetFormat}`);
            }

            const url = URL.createObjectURL(resultBlob);
            setDownloadUrl(url);

        } catch (error: any) {
            console.error(error);
            setError('Dönüştürme sırasında bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
        } finally {
            setConverting(false);
        }
    };

    return (
        <div className="container mx-auto max-w-2xl min-h-[70vh] flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
            >
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-2 text-gradient">Dosya Dönüştürücü</h1>
                    <p className="text-muted-foreground">Belgelerinizi anında dönüştürün. (Tarayıcı tabanlı, hızlı ve güvenli)</p>
                </div>

                <div className="glass-card rounded-3xl p-8 space-y-6">
                    {/* Dropzone */}
                    <div
                        {...getRootProps()}
                        className={clsx(
                            "border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors duration-200",
                            isDragActive ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/20 hover:bg-white/5",
                            file && "border-green-500/50 bg-green-500/5"
                        )}
                    >
                        <input {...getInputProps()} />
                        <AnimatePresence mode="wait">
                            {file ? (
                                <motion.div
                                    key="file"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="space-y-2"
                                >
                                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto text-green-500">
                                        <FileText size={32} />
                                    </div>
                                    <p className="font-medium text-lg">{file.name}</p>
                                    <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="empty"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="space-y-2"
                                >
                                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto text-primary">
                                        <Upload size={32} />
                                    </div>
                                    <p className="font-medium text-lg">Dosyayı buraya sürükleyin</p>
                                    <p className="text-sm text-muted-foreground">PDF, PNG, JPG deseklenir</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-2"
                        >
                            <AlertCircle size={20} />
                            {error}
                        </motion.div>
                    )}

                    {/* Controls */}
                    {file && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-4"
                        >
                            <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl">
                                <span className="text-sm font-medium">Hedef Format:</span>
                                <select
                                    value={targetFormat}
                                    onChange={(e) => setTargetFormat(e.target.value)}
                                    className="bg-transparent border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary"
                                >
                                    <option value="png" className="bg-card">PNG Resim</option>
                                    <option value="jpg" className="bg-card">JPG Resim</option>
                                    <option value="pdf" className="bg-card">PDF Belge</option>
                                    <option value="webp" className="bg-card">WEBP Resim</option>
                                </select>
                            </div>

                            {!downloadUrl ? (
                                <button
                                    onClick={handleConvert}
                                    disabled={converting}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-500 font-bold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {converting ? (
                                        <>
                                            <Loader2 className="animate-spin" /> Dönüştürülüyor...
                                        </>
                                    ) : (
                                        <>Dönüştürmeyi Başlat</>
                                    )}
                                </button>
                            ) : (
                                <a
                                    href={downloadUrl}
                                    download={customFilename}
                                    className="w-full py-4 rounded-xl bg-green-500 font-bold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                >
                                    <Download /> Dosyayı İndir
                                </a>
                            )}
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
