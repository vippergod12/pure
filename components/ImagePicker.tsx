'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { bytesOfDataUrl, compressImage, formatBytes } from '@/lib/utils/image';

interface Props {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  disabled?: boolean;
}

export default function ImagePicker({ value, onChange, label = 'Ảnh', disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState(false);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const dataUrl = await compressImage(file, { maxSize: 1000, quality: 0.82 });
      onChange(dataUrl);
      setInfo(`${file.name} → ${formatBytes(bytesOfDataUrl(dataUrl))}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xử lý được ảnh');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function clear() {
    onChange('');
    setInfo(null);
    setError(null);
  }

  const hasValue = value && value.length > 0;

  return (
    <div className="image-picker">
      <span className="image-picker-label">{label}</span>

      <div className="image-picker-area">
        {hasValue ? (
          <div className="image-picker-preview">
            {/* Admin preview, dùng <img> thường để preview data URL nhanh */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="preview" />
            <div className="image-picker-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => inputRef.current?.click()} disabled={busy || disabled}>
                Đổi ảnh
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={clear} disabled={busy || disabled}>
                Xoá
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="image-picker-drop"
            onClick={() => inputRef.current?.click()}
            disabled={busy || disabled}
          >
            <span className="image-picker-icon" aria-hidden>↑</span>
            <span className="image-picker-title">{busy ? 'Đang xử lý...' : 'Bấm để chọn ảnh'}</span>
            <span className="image-picker-sub">JPG / PNG / WEBP • ảnh sẽ tự nén tới ~1000px</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          hidden
          disabled={busy || disabled}
        />
      </div>

      {info && <div className="image-picker-info">{info}</div>}
      {error && <div className="form-error">{error}</div>}

      <button
        type="button"
        className="image-picker-toggle"
        onClick={() => setShowUrl((v) => !v)}
      >
        {showUrl ? 'Đóng' : 'Hoặc dán URL ảnh →'}
      </button>
      {showUrl && (
        <input
          type="url"
          placeholder="https://..."
          value={value.startsWith('data:') ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          className="image-picker-url"
          disabled={disabled}
        />
      )}
    </div>
  );
}
