export type ManualQrProvider = 'momo_qr' | 'zalopay_qr';

export interface ManualQrConfig {
  provider: ManualQrProvider;
  label: string;
  paymentMethod: 'MOMO_QR' | 'ZALOPAY_QR';
  qrImageUrl: string;
  receiverName: string;
  receiverAccount: string;
}

function env(name: string): string {
  return process.env[name]?.trim() ?? '';
}

export function normalizeManualQrProvider(value: unknown): ManualQrProvider | null {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (raw === 'momo_qr') return 'momo_qr';
  if (raw === 'zalopay_qr') return 'zalopay_qr';
  return null;
}

export function getManualQrConfig(provider: ManualQrProvider): ManualQrConfig {
  if (provider === 'momo_qr') {
    return {
      provider,
      label: 'MoMo QR',
      paymentMethod: 'MOMO_QR',
      qrImageUrl: env('MOMO_QR_IMAGE_URL'),
      receiverName: env('MOMO_RECEIVER_NAME'),
      receiverAccount: env('MOMO_RECEIVER_ACCOUNT'),
    };
  }

  return {
    provider,
    label: 'ZaloPay QR',
    paymentMethod: 'ZALOPAY_QR',
    qrImageUrl: env('ZALOPAY_QR_IMAGE_URL'),
    receiverName: env('ZALOPAY_RECEIVER_NAME'),
    receiverAccount: env('ZALOPAY_RECEIVER_ACCOUNT'),
  };
}

export function isManualQrReady(config: ManualQrConfig): boolean {
  return Boolean(config.qrImageUrl);
}
