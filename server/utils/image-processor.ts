import sharp from 'sharp';

export interface ImageProcessOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export async function processImage(
  buffer: Buffer,
  options: ImageProcessOptions = {},
): Promise<Buffer> {
  const {
    width = 800,
    height = 600,
    quality = 80,
    format = 'webp',
  } = options;

  let pipeline = sharp(buffer);

  pipeline = pipeline.resize(width, height, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  switch (format) {
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality });
      break;
    case 'png':
      pipeline = pipeline.png({ quality });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality });
      break;
  }

  return pipeline.toBuffer();
}

