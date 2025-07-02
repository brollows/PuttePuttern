import jsPDF from 'jspdf';


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

    // 🖤 Gråskala + invertering
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



    // 📌 Utsnitt for NAVN
    const nameCropX = 200;
    const nameCropY = 35;
    const nameCropWidth = 600;
    const nameCropHeight = 50;

    const nameImageData = ctx.getImageData(nameCropX, nameCropY, nameCropWidth, nameCropHeight);
    const nameCanvas = document.createElement('canvas');
    nameCanvas.width = nameCropWidth;
    nameCanvas.height = nameCropHeight;
    const nameCtx = nameCanvas.getContext('2d')!;
    nameCtx.putImageData(nameImageData, 0, 0);

    const nameResult = await Tesseract.recognize(nameCanvas, 'eng', {
        //logger: (m: any) => console.log('🔠 Navn-OCR:', m),
    });

    const rawName = nameResult.data.text.trim().split('\n')[0] || 'Ukjent';
    const cleanedName = rawName.replace(/[^A-ZÆØÅa-zæøå\s-]/g, '').trim(); // valideringsryddig


    const fullText = await runFullTextOCR(canvas);
    const parLine = extractParLine(fullText);
    if (!parLine) {
        console.warn("❌ Fant ikke par-linje i OCR-tekst.");
        return null;
    }

    const parArray = parLine.split(/\s+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n));
    const imageSnippets: string[] = [];
    const scoreArray = await extractScoreNumbersFromCanvas(canvas, parArray.length, imageSnippets);


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
    // 📌 Utsnitt for TOTAL i høyre topphjørne
    const totalCropWidth = 350;
    const totalCropHeight = 140;
    const totalCropOffsetRight = 0; // helt i hjørnet

    const totalCropX = canvas.width - totalCropOffsetRight - totalCropWidth;
    const totalCropY = 0;

    const totalImageData = ctx.getImageData(totalCropX, totalCropY, totalCropWidth, totalCropHeight);
    const totalCanvas = document.createElement('canvas');
    totalCanvas.width = totalCropWidth;
    totalCanvas.height = totalCropHeight;
    const totalCtx = totalCanvas.getContext('2d')!;
    totalCtx.putImageData(totalImageData, 0, 0);


    // utklipp test
    const debugSnippets: string[] = [];
    const totalImage = totalCanvas.toDataURL('image/png');
    debugSnippets.push(totalImage);

    // ➕ Lagre utklipp som PDF
    //createPDFfromImages([...imageSnippets, ...debugSnippets]);


    const totalResult = await Tesseract.recognize(totalCanvas, 'eng');
    // Eksempel på typisk format: `+3 (77)`
    const rawTotalText = totalResult.data.text.trim();
    const totalMatch = rawTotalText.match(/([+-]?\d+)/);
    let total = totalMatch ? parseInt(totalMatch[1], 10) : null;
    if (total == null && scoreArray.length !== parArray.length) {
        total = bogeys - birdies;
    }

    return {
        navn: cleanedName || 'Ukjent',
        total: total,
        birdies,
        pars,
        bogeys
    };
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
        //logger: m => console.log('🧠 OCR (full):', m)
    });
    return result.data.text;
}

function extractParLine(text: string): string | null {
    const lines = text.split('\n').map(l => l.trim().toLowerCase());

    for (const line of lines) {
        if (line.includes("par")) {
            //console.log("🔍 Par-linje funnet:", line);
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
    count: number,
    imageSnippets: string[]
): Promise<number[]> {
    const { default: Tesseract } = await import('tesseract.js');
    const ctx = canvas.getContext('2d')!;
    const totalWidth = canvas.width;

    const offsetY = 503;
    const height = 30;
    const marginLeft = 170;
    const marginRight = 40;

    const usableWidth = totalWidth - marginLeft - marginRight;
    const rawCellWidth = usableWidth / count;

    const values: number[] = [];

    for (let i = 0; i < count; i++) {
        const cellCenterX = marginLeft + (i + 0.5) * rawCellWidth;
        const fixedCropWidth = 36;
        const x = Math.round(cellCenterX - fixedCropWidth / 2);
        const width = fixedCropWidth;


        const sub = ctx.getImageData(x, offsetY, width, height);

        const subCanvas = document.createElement('canvas');
        const subCtx = subCanvas.getContext('2d')!;
        subCtx.imageSmoothingEnabled = false;
        subCanvas.width = width;
        subCanvas.height = height;
        subCtx.putImageData(sub, 0, 0);

        subCtx.putImageData(sub, 0, 0);

        // 🧱 Kun padding – ingen oppskalering
        const padded = padCanvas(subCanvas, 50, 50);

        // 📷 Lagre snippen for PDF/feilsøking før OCR
        const subImage = padded.toDataURL('image/png');
        imageSnippets.push(subImage);

        const {
            data: { text }
        } = await Tesseract.recognize(padded);

        const raw = text.trim();
        //console.log(raw)
        const parsed = parseInt(raw, 10);
        if (!isNaN(parsed)) {
            values.push(parsed);
        } else {
            console.warn(`🚫 Ugyldig OCR for hull ${i + 1}:`, raw);
        }
    }
    // console.log("values:");
    // console.log(values);
    return values;
}

function padCanvas(
    original: HTMLCanvasElement,
    padX = 50,
    padY = 50
): HTMLCanvasElement {
    const originalCtx = original.getContext('2d')!;
    const imageData = originalCtx.getImageData(0, 0, original.width, original.height);
    const data = imageData.data;

    const colorCounts: Record<string, number> = {};

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const key = `${r},${g},${b}`;
        colorCounts[key] = (colorCounts[key] || 0) + 1;
    }

    // Finn mest brukte farge
    let mostCommon = '255,255,255';
    let maxCount = 0;
    for (const color in colorCounts) {
        if (colorCounts[color] > maxCount) {
            mostCommon = color;
            maxCount = colorCounts[color];
        }
    }

    const [r, g, b] = mostCommon.split(',').map(Number);
    const bgColor = `rgb(${r}, ${g}, ${b})`;

    // Nytt canvas med padding
    const padded = document.createElement('canvas');
    padded.width = original.width + 2 * padX;
    padded.height = original.height + 2 * padY;

    const paddedCtx = padded.getContext('2d')!;
    paddedCtx.fillStyle = bgColor;
    paddedCtx.fillRect(0, 0, padded.width, padded.height);

    paddedCtx.drawImage(original, padX, padY);
    return padded;
}



function createPDFfromImages(images: string[]) {
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [images.length * 60 + 40, 70]
    });

    images.forEach((img, i) => {
        pdf.addImage(img, 'PNG', 20 + i * 60, 10, 50, 50);
    });

    pdf.save('ocr-snippets.pdf');
}
