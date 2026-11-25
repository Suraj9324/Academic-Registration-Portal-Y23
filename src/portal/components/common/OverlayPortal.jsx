import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Universal Overlay Portal
 * Mounts overlays directly to `document.body` via React createPortal.
 * - Guarantees positioning relative to the true browser viewport (100dvh / 100vw).
 * - Completely immune to parent container stacking contexts, transforms, or overflow clipping.
 * - Locks background body scrolling while open and restores on unmount.
 * - Handles Escape key to close cleanly.
 */
export default function OverlayPortal({
  isOpen = true,
  onClose,
  children,
  className = "modal-portal-overlay",
  lockScroll = true,
  closeOnOutsideClick = false,
}) {
  const [mounted, setMounted] = useState(false);
  const scrollPosRef = useRef(0);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Lock body scroll while overlay is open, preserving scroll position
  useEffect(() => {
    if (!isOpen || !lockScroll) return;

    scrollPosRef.current = window.scrollY || document.documentElement.scrollTop;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen, lockScroll]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen || !onClose) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={className}
      role="presentation"
      onMouseDown={(e) => {
        if (closeOnOutsideClick && e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      {children}
    </div>,
    document.body
  );
}
