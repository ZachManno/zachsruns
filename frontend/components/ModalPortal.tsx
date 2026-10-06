'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders modal markup into <body>.
 *
 * Modals are declared next to the thing they act on, which is usually deep inside a `.card`.
 * A card's `backdrop-blur` makes it the containing block for `position: fixed` children, so an
 * in-place `.modal-overlay` gets sized to the card instead of the viewport and then clipped by
 * `.glow-edge`'s `overflow: hidden` - the page dims but the dialog lands off-screen.
 */
export default function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(children, document.body);
}
