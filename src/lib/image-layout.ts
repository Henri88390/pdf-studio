export type ImageSize = { width: number; height: number };
export const MAX_IMAGE_DIMENSION = 16384;
export const MAX_IMAGE_PIXELS = 32_000_000;

export function combinedImageSize(pages: ImageSize[]): ImageSize {
  const { width, height } = pages.reduce(
    (size, page) => ({ width: Math.max(size.width, page.width), height: size.height + page.height }),
    { width: 0, height: 0 },
  );
  if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height) || width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION || width * height > MAX_IMAGE_PIXELS) {
    throw new Error("The combined image is too large for safe browser export. Choose one image per page instead.");
  }
  return { width, height };
}
