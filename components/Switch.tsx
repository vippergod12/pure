'use client';

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  size?: 'sm' | 'md';
}

export default function Switch({
  checked,
  onChange,
  disabled,
  ariaLabel,
  size = 'md',
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange(!checked);
      }}
      className={`switch switch-${size} ${checked ? 'is-on' : 'is-off'}`}
    >
      <span className="switch-track" aria-hidden />
      <span className="switch-thumb" aria-hidden />
    </button>
  );
}
