export interface CompressOptions {
  maxSize?: number;
  quality?: number;
  mime?: 'image/jpeg' | 'image/webp' | 'image/png';
}

const DEFAULTS: Required<CompressOptions> = {
  maxSize: 1000,
  quality: 0.82,
  mime: 'image/jpeg',
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh'));
    };
    img.src = url;
  });
}

export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<string> {
  const { maxSize, quality, mime } = { ...DEFAULTS, ...options };

  if (!file.type.startsWith('image/')) {
    throw new Error('File không phải ảnh');
  }

  const img = await loadImage(file);
  const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ canvas');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  return canvas.toDataURL(mime, quality);
}

export function bytesOfDataUrl(dataUrl: string): number {
  const i = dataUrl.indexOf(',');
  if (i < 0) return 0;
  const base = dataUrl.length - i - 1;
  return Math.floor(base * 0.75);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
