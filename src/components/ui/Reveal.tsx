"use client";

import React, { useEffect, useRef, useState } from "react";

interface RevealProps {
  children: React.ReactNode;
  /** Seconds to wait before the animation starts (use index * 0.1 to stagger). */
  delay?: number;
  /** Starting offset in px; negative values slide in from above. */
  y?: number;
  className?: string;
}

type Phase = "visible" | "hidden" | "shown";

/**
 * Fades and lifts its children into place the first time they scroll into view.
 *
 * Content is visible by default (server render, no JS, slow hydration on a
 * phone). Only after hydration, and only for blocks that start below the fold,
 * it is hidden and revealed by an IntersectionObserver. Blocks already on
 * screen are never hidden, so nothing can get stuck invisible.
 */
export function Reveal({ children, delay = 0, y = 24, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("visible");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    // Already on screen (or above it, e.g. after a scroll restore): leave as is.
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    setPhase("hidden");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPhase("shown");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hidden = phase === "hidden";

  return (
    <div
      ref={ref}
      className={className}
      style={
        phase === "visible"
          ? undefined
          : {
              opacity: hidden ? 0 : 1,
              transform: hidden ? `translateY(${y}px)` : "none",
              transition: hidden
                ? "none"
                : `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
            }
      }
    >
      {children}
    </div>
  );
}
