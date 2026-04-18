"use client";

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const OUTPUT_MIME = "image/webp";

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };

    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo preparar la imagen."));
          return;
        }

        resolve(blob);
      },
      type,
      quality,
    );
  });
}

function getNormalizedImageType(blob: Blob) {
  if (blob.type === "image/png" || blob.type === "image/jpeg" || blob.type === "image/webp") {
    return blob.type;
  }

  return OUTPUT_MIME;
}

function getImageExtension(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpg";
  return "webp";
}

export async function normalizeStoryImage(file: File) {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No se pudo preparar la imagen.");
  }

  const scale = Math.max(STORY_WIDTH / image.width, STORY_HEIGHT / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = (STORY_WIDTH - drawWidth) / 2;
  const offsetY = (STORY_HEIGHT - drawHeight) / 2;

  context.fillStyle = "#0f172a";
  context.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  const blob = await canvasToBlob(canvas, OUTPUT_MIME, 0.92);
  const normalizedType = getNormalizedImageType(blob);
  const baseName = file.name.replace(/\.[^.]+$/, "") || "story";

  return new File([blob], `${baseName}.${getImageExtension(normalizedType)}`, {
    type: normalizedType,
    lastModified: Date.now(),
  });
}

export const storyImageConfig = {
  maxUploadMb: 5,
  width: STORY_WIDTH,
  height: STORY_HEIGHT,
};
