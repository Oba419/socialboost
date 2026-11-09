"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SELECTOR = "[data-reveal], [data-reveal-stagger], [data-reveal-bars]";

/**
 * Global scroll-reveal engine. Any element with `data-reveal`,
 * `data-reveal-stagger` or `data-reveal-bars` animates in (see globals.css)
 * the first time it enters the viewport. Works with Server Components: no
 * wrappers needed, just attributes. Re-scans on navigation and DOM changes.
 * Users who prefer reduced motion see content immediately.
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    (window as Window & { __revealBooted?: boolean }).__revealBooted = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce || !("IntersectionObserver" in window)) {
      document.querySelectorAll(SELECTOR).forEach((el) => el.classList.add("is-visible"));
      return;
    }

    root.classList.add("reveal-ready");

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    const observe = (scope: ParentNode) => {
      scope.querySelectorAll(SELECTOR).forEach((el) => {
        if (!el.classList.contains("is-visible")) io.observe(el);
      });
    };
    observe(document);

    // Catch content rendered after navigation / streaming / client updates.
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(SELECTOR) && !node.classList.contains("is-visible")) io.observe(node);
          observe(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}
