import { motion } from "motion/react";

// Standard entry animation for every top-level screen. Wraps the root of a
// screen component so route changes feel like a soft arrival instead of a
// hard swap. Exit handled by AnimatePresence in App.
export default function PageWrapper({ children, style }) {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0, y: -4 }}
      transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
      style={style}
    >
      {children}
    </motion.div>
  );
}
