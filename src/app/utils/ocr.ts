export interface ParsedScore {
    navn: string;
    total: number | null;
    birdies: number;
    pars: number;
    bogeys: number;
}

export async function runOCR(file: File): Promise<ParsedScore | null> {
    if (typeof window === 'undefined') {
        console.warn('🚫 OCR deaktivert under SSR');
        return null;
    }
    const { default: Tesseract } = await import('tesseract.js');

    const imageDataUrl = await toDataURL(file);
    const originalImage = await loadImage(imageDataUrl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    ctx.drawImage(originalImage, 0, 0);

    // Gråskala + invertert
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const avg = (r + g + b) / 3;
        const inv = 255 - avg;
        data[i] = inv;
        data[i + 1] = inv;
        data[i + 2] = inv;
    }
    ctx.putImageData(imgData, 0, 0);

    const fullText = await runFullTextOCR(canvas);
    const parLine = extractParLine(fullText);
    if (!parLine) {
        console.warn("❌ Fant ikke par-linje i OCR-tekst.");
        return null;
    }

    const parArray = parLine.split(/\s+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n));
    const scoreArray = await extractScoreNumbersFromCanvas(canvas, parArray.length);

    if (scoreArray.length !== parArray.length) {
        console.warn(`⚠️ Antall scorer (${scoreArray.length}) != antall hull (${parArray.length})`);
    }

    let birdies = 0, pars = 0, bogeys = 0;
    for (let i = 0; i < Math.min(parArray.length, scoreArray.length); i++) {
        const par = parArray[i];
        const score = scoreArray[i];
        if (score < par) birdies++;
        else if (score === par) pars++;
        else bogeys += (score - par);
    }

    const name = fullText.split('\n').find(line => /^[A-ZÆØÅ][a-zæøå]+$/.test(line)) || 'Ukjent';
    const totalMatch = fullText.match(/\+?(\d+)\s*\(\d+\)/);
    const total = totalMatch ? parseInt(totalMatch[1], 10) : null;

    return { navn: name, total, birdies, pars, bogeys };
}

function toDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
    });
}

async function runFullTextOCR(canvas: HTMLCanvasElement): Promise<string> {
    const { default: Tesseract } = await import('tesseract.js');
    const result = await Tesseract.recognize(canvas, 'eng', {
        logger: m => console.log('🧠 OCR (full):', m)
    });
    return result.data.text;
}

// 🔍 Forbedret PAR-linjeuttrekk
function extractParLine(text: string): string | null {
    const lines = text.split('\n').map(l => l.trim().toLowerCase());

    for (const line of lines) {
        if (line.includes("par")) {
            console.log("🔍 Par-linje funnet:", line);
            const numbers = line
                .split(/\s+/)
                .map(token => parseInt(token, 10))
                .filter(n => !isNaN(n) && n >= 1 && n <= 20);

            if (numbers.length >= 3) {
                return numbers.join(' ');
            }
        }
    }

    console.warn("❌ Fant ikke gyldig par-linje i OCR-tekst.");
    return null;
}

async function extractScoreNumbersFromCanvas(
    canvas: HTMLCanvasElement,
    count: number
): Promise<number[]> {
    const { default: Tesseract } = await import('tesseract.js');
    const ctx = canvas.getContext('2d')!;
    const widthPerCell = 45;
    const height = 45;
    const spacing = 5;
    const offsetX = 100;
    const offsetY = 360;

    const values: number[] = [];
    for (let i = 0; i < count; i++) {
        const x = offsetX + i * (widthPerCell + spacing);
        const sub = ctx.getImageData(x, offsetY, widthPerCell, height);

        const subCanvas = document.createElement('canvas');
        const subCtx = subCanvas.getContext('2d')!;
        subCanvas.width = widthPerCell;
        subCanvas.height = height;
        subCtx.putImageData(sub, 0, 0);

        const result = await Tesseract.recognize(subCanvas, 'eng', {
            logger: m => console.log(`🔎 OCR hull ${i + 1}:`, m),
        });

        const raw = result.data.text.trim();
        const parsed = parseInt(raw, 10);
        if (!isNaN(parsed)) {
            values.push(parsed);
        } else {
            console.warn(`🚫 Ugyldig OCR for hull ${i + 1}:`, raw);
        }
    }

    return values;
}
