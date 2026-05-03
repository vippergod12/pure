'use client';

import { useEffect, useRef } from 'react';
import type { DragEvent, PointerEvent } from 'react';

/**
 * Khoảng cách tối thiểu (px) chuột/ngón tay phải di chuyển để được coi là
 * drag thay vì click. 6px đủ để lọc rung tay vô tình mà không bóp click thật.
 */
const DEFAULT_THRESHOLD = 6;

/**
 * Bảo vệ links/buttons bên trong vùng kéo (Swiper carousel) khỏi bị trigger
 * click khi user kéo ngang để chuyển slide.
 *
 * Tại sao cần dù Swiper đã có `preventClicks`:
 *   - Swiper attach click listener ở swiper element. Trong đa số case
 *     preventClicks + preventClicksPropagation chặn được click tới <a>.
 *   - Tuy nhiên có edge case (browser cụ thể, route prefetch, focus, v.v.)
 *     mà click vẫn lọt qua → Next.js Link điều hướng. Hook này là safety
 *     net cuối cùng.
 *
 * Cách dùng:
 *   const guard = useDragGuard();
 *   <div {...guard.bind()}>
 *     <Swiper>...</Swiper>
 *   </div>
 */
export function useDragGuard(threshold = DEFAULT_THRESHOLD) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const draggedRef = useRef(false);
  const trackingRef = useRef(false);
  const wrapperRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function onMove(e: globalThis.PointerEvent) {
      if (!trackingRef.current) return;
      const s = startRef.current;
      if (!s) return;
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > threshold) {
        draggedRef.current = true;
      }
    }

    function onEnd(e: globalThis.PointerEvent) {
      trackingRef.current = false;
      startRef.current = null;
      // Lớp phòng thủ: nếu vừa drag, tắt pointer-events trên wrapper
      // trong 1 frame để click event sắp tới (nếu có) không trúng <a>.
      if (draggedRef.current && e.pointerType === 'mouse') {
        const w = wrapperRef.current;
        if (w) {
          w.style.pointerEvents = 'none';
          requestAnimationFrame(() => {
            w.style.pointerEvents = '';
          });
        }
      }
    }

    function onClickCapture(e: globalThis.MouseEvent) {
      if (!draggedRef.current) return;
      const w = wrapperRef.current;
      if (!w) return;
      const target = e.target as Node | null;
      if (!target || !w.contains(target)) {
        draggedRef.current = false;
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      draggedRef.current = false;
    }

    window.addEventListener('pointermove', onMove, { capture: true, passive: true });
    window.addEventListener('pointerup', onEnd, { capture: true });
    window.addEventListener('pointercancel', onEnd, { capture: true });
    // QUAN TRỌNG: window (không phải document) — Next.js App Router
    // attach React event delegation TRỰC TIẾP lên document, nên capture
    // handler trên document có thể fire SAU React. Window là tổ tiên của
    // document → capture handler trên window LUÔN fire trước.
    window.addEventListener('click', onClickCapture, { capture: true });

    return () => {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onEnd, true);
      window.removeEventListener('pointercancel', onEnd, true);
      window.removeEventListener('click', onClickCapture, true);
    };
  }, [threshold]);

  function bind() {
    return {
      onPointerDownCapture(e: PointerEvent<HTMLElement>) {
        startRef.current = { x: e.clientX, y: e.clientY };
        draggedRef.current = false;
        trackingRef.current = true;
        wrapperRef.current = e.currentTarget;
      },
      onDragStart(e: DragEvent<HTMLElement>) {
        e.preventDefault();
      },
    };
  }

  return { bind };
}
