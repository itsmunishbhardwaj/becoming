import { motion } from "motion/react";

// Stagger a list of children in with a short lift. Keeps motion props co-located
// so screens don't repeat the same configuration five times.

const containerVariants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.035, delayChildren: 0.02 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.23, 1, 0.32, 1] } },
};

function reducedMotion() {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function StaggerList({ children, style, as = "div" }) {
  const reduced = reducedMotion();
  const MotionTag = motion[as];
  return (
    <MotionTag
      variants={reduced ? undefined : containerVariants}
      initial={reduced ? false : "hidden"}
      animate="show"
      style={style}
    >
      {children}
    </MotionTag>
  );
}

export function StaggerItem({ children, style, ...rest }) {
  const reduced = reducedMotion();
  return (
    <motion.div
      variants={reduced ? undefined : itemVariants}
      style={style}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
