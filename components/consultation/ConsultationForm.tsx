'use client';

import { FormEvent, useState } from 'react';
import { api } from '@/lib/api-client';

type Gender = 'male' | 'female' | 'other';
type Status = 'idle' | 'submitting' | 'success' | 'error';

const GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: 'female', label: 'Nữ' },
  { value: 'male', label: 'Nam' },
  { value: 'other', label: 'Khác' },
];

function validatePhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return 'Vui lòng nhập số điện thoại';
  const digits = trimmed.replace(/[^\d]/g, '');
  if (digits.length < 8) return 'Số điện thoại quá ngắn (tối thiểu 8 chữ số)';
  if (digits.length > 15) return 'Số điện thoại quá dài (tối đa 15 chữ số)';
  return null;
}

export default function ConsultationForm() {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const phoneError = phoneTouched ? validatePhone(phone) : null;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPhoneTouched(true);
    const err = validatePhone(phone);
    if (err) {
      setError(err);
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setError(null);
    try {
      await api.submitConsultation({
        name: name.trim() || undefined,
        gender: gender || undefined,
        phone: phone.trim(),
        note: note.trim() || undefined,
      });
      setStatus('success');
      setName('');
      setGender('');
      setPhone('');
      setNote('');
      setPhoneTouched(false);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.');
    }
  }

  if (status === 'success') {
    return (
      <div className="consult-form-card consult-success" role="status">
        <div className="consult-success-mark" aria-hidden>
          {'✓\uFE0E'}
        </div>
        <h2>Cảm ơn bạn!</h2>
        <p>
          Chúng tôi đã nhận được yêu cầu tư vấn. Chuyên gia PURE sẽ liên hệ
          với bạn trong vòng <strong>30 phút</strong> (giờ hành chính,
          8:00–20:00).
        </p>
        <button
          type="button"
          className="consult-submit consult-submit-ghost"
          onClick={() => setStatus('idle')}
        >
          Gửi yêu cầu khác
        </button>
      </div>
    );
  }

  const isSubmitting = status === 'submitting';

  return (
    <form className="consult-form-card" onSubmit={onSubmit} noValidate>
      <h2 className="consult-form-title">Nhận tư vấn miễn phí</h2>
      <p className="consult-form-sub">
        Điền thông tin — chúng tôi sẽ liên hệ trong 30 phút.
      </p>

      <div className="consult-field">
        <label htmlFor="cf-name">Họ và tên</label>
        <input
          id="cf-name"
          type="text"
          autoComplete="name"
          maxLength={120}
          placeholder="Nguyễn Thị A"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="consult-field">
        <span className="consult-label">Giới tính</span>
        <div className="consult-radio-row" role="radiogroup" aria-label="Giới tính">
          {GENDER_OPTIONS.map((opt) => {
            const checked = gender === opt.value;
            return (
              <label
                key={opt.value}
                className={`consult-radio ${checked ? 'is-checked' : ''}`}
              >
                <input
                  type="radio"
                  name="gender"
                  value={opt.value}
                  checked={checked}
                  onChange={() => setGender(opt.value)}
                  disabled={isSubmitting}
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="consult-field">
        <label htmlFor="cf-phone">
          Số điện thoại <span className="consult-required" aria-hidden>*</span>
          <span className="visually-hidden"> (bắt buộc)</span>
        </label>
        <input
          id="cf-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          maxLength={30}
          placeholder="0901 234 567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={() => setPhoneTouched(true)}
          disabled={isSubmitting}
          aria-invalid={!!phoneError}
          aria-describedby={phoneError ? 'cf-phone-err' : undefined}
          className={phoneError ? 'has-error' : ''}
        />
        {phoneError && (
          <span id="cf-phone-err" className="consult-field-error">
            {phoneError}
          </span>
        )}
      </div>

      <div className="consult-field">
        <label htmlFor="cf-note">Ghi chú (không bắt buộc)</label>
        <textarea
          id="cf-note"
          rows={3}
          maxLength={1000}
          placeholder="Bạn quan tâm sản phẩm nào? Có yêu cầu đặc biệt gì không?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      {status === 'error' && error && (
        <div className="consult-form-error" role="alert">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="consult-submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Đang gửi…' : 'Gửi yêu cầu tư vấn'}
      </button>

      <p className="consult-form-note">
        Bằng việc gửi form, bạn đồng ý cho PURE liên hệ qua số điện thoại
        đã cung cấp.
      </p>
    </form>
  );
}
