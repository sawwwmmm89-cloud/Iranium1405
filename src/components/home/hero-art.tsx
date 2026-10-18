'use client';

import { motion, useReducedMotion } from 'framer-motion';

const items = [
  { label: 'ویدئو', className: 'start-4 top-6', delay: 0 },
  { label: 'کلاس زنده', className: 'end-2 top-24', delay: 0.6 },
  { label: 'پیشرفت', className: 'start-10 bottom-8', delay: 1.2 },
];

export function HeroArt() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-md rounded-3xl bg-primary-soft">
      <div className="absolute inset-8 rounded-2xl border border-primary/15 bg-white shadow-soft" />
      {items.map((i) => (
        <motion.span
          key={i.label}
          className={`absolute rounded-xl border border-ink/[.08] bg-white px-4 py-2 text-sm font-medium shadow-soft ${i.className}`}
          initial={{ opacity: 0, y: 12 }}
          animate={reduce ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -8, 0] }}
          transition={reduce ? { duration: 0.2 } : { duration: 5, repeat: Infinity, delay: i.delay, ease: 'easeInOut' }}
        >
          {i.label}
        </motion.span>
      ))}
    </div>
  );
}
