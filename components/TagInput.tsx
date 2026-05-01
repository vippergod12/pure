'use client';

import { KeyboardEvent, useState } from 'react';

interface TagInputProps {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  hint?: string;
  suggestions?: string[];
}

function normalize(items: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const trimmed = it.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export default function TagInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
  suggestions,
}: TagInputProps) {
  const [draft, setDraft] = useState('');

  function commit(text: string) {
    const parts = text
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    onChange(normalize([...value, ...parts]));
    setDraft('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function remove(idx: number) {
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  }

  function toggleSuggestion(s: string) {
    if (value.some((v) => v.toLowerCase() === s.toLowerCase())) {
      onChange(value.filter((v) => v.toLowerCase() !== s.toLowerCase()));
    } else {
      onChange(normalize([...value, s]));
    }
  }

  return (
    <div className="field">
      <span>{label}</span>
      <div className="tag-input">
        {value.map((tag, idx) => (
          <span key={`${tag}-${idx}`} className="tag-chip">
            {tag}
            <button
              type="button"
              className="tag-remove"
              onClick={() => remove(idx)}
              aria-label={`Xoá ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          className="tag-input-field"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft && commit(draft)}
          placeholder={value.length === 0 ? placeholder : ''}
        />
      </div>
      {suggestions && suggestions.length > 0 && (
        <div className="tag-suggestions">
          {suggestions.map((s) => {
            const active = value.some((v) => v.toLowerCase() === s.toLowerCase());
            return (
              <button
                key={s}
                type="button"
                className={`tag-suggestion ${active ? 'is-active' : ''}`}
                onClick={() => toggleSuggestion(s)}
              >
                {s}
              </button>
            );
          })}
        </div>
      )}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}
