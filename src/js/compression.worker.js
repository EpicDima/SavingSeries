const MAX_SIDE = 2560;

// Отвечает сжатой картинкой (data URL) или null, если сжать не вышло или она не стала меньше
self.onmessage = async ({data: image}) => {
    try {
        const original = await (await fetch(image)).blob();
        const compressed = await compress(original);
        self.postMessage(compressed.size < original.size ? new FileReaderSync().readAsDataURL(compressed) : null);
    } catch (error) {
        console.error("Image compression failed:", error);
        self.postMessage(null);
    }
};

async function compress(blob) {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(MAX_SIDE / Math.max(bitmap.width, bitmap.height), 1);
    const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const type = hasTransparency(context, canvas) ? "image/png" : "image/jpeg";
    return canvas.convertToBlob({type, quality: 0.5});
}

function hasTransparency(context, {width, height}) {
    const pixels = context.getImageData(0, 0, width, height).data;
    for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] < 255) {
            return true;
        }
    }
    return false;
}
