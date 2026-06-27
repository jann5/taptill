"use client";

const MAX_IMAGE_DIMENSION = 1200;
const OUTPUT_QUALITY = 0.82;

export async function readProductImageFile(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Wybierz plik graficzny");
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return dataUrl;
  }

  const scale = Math.min(
    1,
    MAX_IMAGE_DIMENSION / Math.max(image.width, image.height),
  );
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  canvas.width = width;
  canvas.height = height;

  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/webp", OUTPUT_QUALITY);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Nie udało się wczytać zdjęcia"));
    };

    reader.onerror = () => reject(new Error("Nie udało się wczytać zdjęcia"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Nie udało się otworzyć zdjęcia"));
    image.src = src;
  });
}
