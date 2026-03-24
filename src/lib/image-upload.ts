const DEFAULT_MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_OUTPUT_BYTES = 450 * 1024;
const DEFAULT_MAX_DIMENSION = 512;
const MIN_DIMENSION = 160;
const MIN_QUALITY = 0.55;

type PrepareImageOptions = {
  label?: string;
  maxSourceBytes?: number;
  maxOutputBytes?: number;
  maxDimension?: number;
};

function getDataUrlByteSize(dataUrl: string) {
  const [, base64 = ''] = dataUrl.split(',', 2);
  const sanitized = base64.replace(/\s/g, '');
  const padding = sanitized.endsWith('==') ? 2 : sanitized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((sanitized.length * 3) / 4) - padding);
}

function loadImageFromObjectUrl(objectUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image.'));
    image.src = objectUrl;
  });
}

async function getImageBitmapFromFile(file: File) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file);
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    return await loadImageFromObjectUrl(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function drawToCanvas(source: CanvasImageSource, width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Image processing is not available in this browser.');
  }

  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

function getTargetDimensions(width: number, height: number, maxDimension: number) {
  if (!width || !height) {
    throw new Error('Image dimensions are invalid.');
  }

  const longestSide = Math.max(width, height);
  if (longestSide <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / longestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function prepareImageForUpload(
  file: File,
  {
    label = 'Image',
    maxSourceBytes = DEFAULT_MAX_SOURCE_BYTES,
    maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
    maxDimension = DEFAULT_MAX_DIMENSION,
  }: PrepareImageOptions = {},
) {
  if (!file.type.startsWith('image/')) {
    throw new Error(`${label} must be an image file.`);
  }

  if (file.size > maxSourceBytes) {
    throw new Error(`${label} must be ${Math.round(maxSourceBytes / (1024 * 1024))}MB or smaller.`);
  }

  const bitmap = await getImageBitmapFromFile(file);

  try {
    const intrinsicWidth = 'naturalWidth' in bitmap ? bitmap.naturalWidth : bitmap.width;
    const intrinsicHeight = 'naturalHeight' in bitmap ? bitmap.naturalHeight : bitmap.height;

    let currentMaxDimension = maxDimension;
    let currentQuality = 0.86;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const dimensions = getTargetDimensions(intrinsicWidth, intrinsicHeight, currentMaxDimension);
      const canvas = drawToCanvas(bitmap, dimensions.width, dimensions.height);
      const dataUrl = canvas.toDataURL('image/webp', currentQuality);

      if (getDataUrlByteSize(dataUrl) <= maxOutputBytes) {
        return dataUrl;
      }

      currentQuality = Math.max(MIN_QUALITY, currentQuality - 0.08);
      if (attempt % 2 === 1) {
        currentMaxDimension = Math.max(MIN_DIMENSION, Math.round(currentMaxDimension * 0.8));
      }
    }
  } finally {
    if ('close' in bitmap && typeof bitmap.close === 'function') {
      bitmap.close();
    }
  }

  throw new Error(`${label} is still too large after compression. Please choose a smaller image.`);
}
