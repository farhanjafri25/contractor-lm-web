'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { usePathname } from 'next/navigation';

/* ─────────────────────────────────────────────────────────
 * PAGE TRANSITION STORYBOARD
 *
 * Read top-to-bottom. Each `at` value is ms after route change.
 *
 *    0ms   previous page softens and drops 6px
 *   40ms   next page fades in and lifts 10px → 0
 *  220ms   content settles at full opacity
 * ───────────────────────────────────────────────────────── */

const TIMING = {
  exit:   120, // outgoing page softens away
  enter:  180, // incoming page fades and lifts in
};

const TRANSITION = {
  offsetY: 10,  // incoming page lift distance
  exitY:   6,   // outgoing page drop distance
};

export function PageTransition({
  children,
  transitionKey,
  className,
}: {
  children: React.ReactNode;
  transitionKey?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const key = transitionKey ?? pathname;

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        className={className}
        initial={{ opacity: 0, y: TRANSITION.offsetY }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: TRANSITION.exitY }}
        transition={{
          opacity: { duration: TIMING.enter / 1000, ease: 'easeOut' },
          y: { duration: TIMING.enter / 1000, ease: 'easeOut' },
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
