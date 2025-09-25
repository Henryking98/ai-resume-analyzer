export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    error?: string;
}

export async function convertPdfToImage(
    file: File
): Promise<PdfConversionResult> {
    try {
        // Ensure running in the browser
        if (typeof window === 'undefined') {
            return {
                imageUrl: '',
                file: null,
                error: 'PDF to image must run in the browser',
            };
        }

        const pdfjsLib = await import('pdfjs-dist');
        const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.min?url');

        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;

        // Load PDF from file
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);

        // Prepare canvas
        const viewport = page.getViewport({ scale: 4 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
            throw new Error('Canvas 2D context not available');
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';

        await page.render({ canvasContext: context, viewport, canvas }).promise;

        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const originalName = file.name.replace(/\.pdf$/i, '');
                        const imageFile = new File(
                            [blob],
                            `${originalName}.png`,
                            {
                                type: 'image/png',
                            }
                        );

                        resolve({
                            imageUrl: URL.createObjectURL(blob),
                            file: imageFile,
                        });
                    } else {
                        resolve({
                            imageUrl: '',
                            file: null,
                            error: 'Failed to create image blob',
                        });
                    }
                },
                'image/png',
                1.0
            );
        });
    } catch (err) {
        console.error('PDF conversion error:', err);
        return {
            imageUrl: '',
            file: null,
            error: `Failed to convert PDF: ${err}`,
        };
    }
}
