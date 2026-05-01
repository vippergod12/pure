'use client';

import { useEffect, useRef, useState } from 'react';

export interface RowAction {
  label: string;
  onClick: () => void;
  variant?: 'ghost' | 'danger';
}

interface Props {
  actions: RowAction[];
}

export default function RowActions({ actions }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div className="row-actions" ref={ref}>
      <div className="row-actions-inline">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            className={`btn btn-sm ${a.variant === 'danger' ? 'btn-danger' : 'btn-ghost'}`}
            onClick={a.onClick}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="row-actions-kebab">
        <button
          type="button"
          className="kebab-btn"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          aria-label="Hành động"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
        <div className={`kebab-menu ${open ? 'is-open' : ''}`} role="menu">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              role="menuitem"
              className={`kebab-item ${a.variant === 'danger' ? 'is-danger' : ''}`}
              onClick={() => {
                setOpen(false);
                a.onClick();
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
