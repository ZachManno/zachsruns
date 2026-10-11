'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// iOS leaves :hover on the element under your finger after a tap. After a
// navigation that often means the first card on the new page looks selected
// even though you never touched it. Suppress hover until the next real press
// (or an actual mouse move) so tap-to-highlight still works.
export default function HoverReset() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('nav-hover-reset');

    let lastX: number | null = null;
    let lastY: number | null = null;

    const release = () => {
      root.classList.remove('nav-hover-reset');
      window.removeEventListener('pointerdown', release, true);
      window.removeEventListener('pointermove', onMove, true);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      if (lastX === null || lastY === null) {
        lastX = event.clientX;
        lastY = event.clientY;
        return;
      }
      if (Math.abs(event.clientX - lastX) + Math.abs(event.clientY - lastY) < 6) return;
      release();
    };

    window.addEventListener('pointerdown', release, { capture: true, passive: true });
    window.addEventListener('pointermove', onMove, { capture: true, passive: true });

    return () => {
      window.removeEventListener('pointerdown', release, true);
      window.removeEventListener('pointermove', onMove, true);
      root.classList.remove('nav-hover-reset');
    };
  }, [pathname]);

  return null;
}
