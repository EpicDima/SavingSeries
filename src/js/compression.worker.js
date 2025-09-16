self.onmessage = async (event) => {
    const {imageBitmap} = event.data;

    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imageBitmap, 0, 0);

    const compressedBlob = await canvas.convertToBlob({type: "image/jpeg", quality: 0.5});

    self.postMessage({compressedBlob});
};
