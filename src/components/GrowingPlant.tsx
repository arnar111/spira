import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface GrowingPlantProps {
  size?: number;
  delay?: number;
  /** 0 = seed, 1 = sprout, 2 = small plant, 3 = full plant with pods */
  stage?: 0 | 1 | 2 | 3;
}

/**
 * Hand-drawn SVG of a pepper plant that animates from seed → sprout → plant → pods.
 * Used in the setup wizard as the visual centerpiece.
 */
export function GrowingPlant({ size = 260, delay = 0, stage = 3 }: GrowingPlantProps) {
  const pathTransition = useMemo(
    () => ({
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      delay,
    }),
    [delay],
  );

  const popTransition = useMemo(
    () => ({
      type: 'spring' as const,
      stiffness: 180,
      damping: 14,
      delay: delay + 0.8,
    }),
    [delay],
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Soil mound */}
      <motion.ellipse
        cx="100"
        cy="178"
        rx="64"
        ry="10"
        fill="#3a2a1f"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay }}
        style={{ transformOrigin: '100px 178px' }}
      />
      <motion.ellipse
        cx="100"
        cy="175"
        rx="58"
        ry="7"
        fill="#5a4232"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: delay + 0.1 }}
        style={{ transformOrigin: '100px 175px' }}
      />

      {/* Seed (visible only at stage 0) */}
      {stage === 0 && (
        <motion.ellipse
          cx="100"
          cy="172"
          rx="4"
          ry="6"
          fill="#cfa86b"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, delay: delay + 0.4 }}
        />
      )}

      {stage >= 1 && (
        <>
          {/* Main stem */}
          <motion.path
            d="M100 172 Q100 130 100 80"
            stroke="#406843"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={pathTransition}
          />

          {/* Cotyledons (first leaves) */}
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...popTransition, delay: delay + 0.6 }}
            style={{ transformOrigin: '100px 130px' }}
          >
            <ellipse cx="88" cy="130" rx="10" ry="4" fill="#739f73" transform="rotate(-20 88 130)" />
            <ellipse cx="112" cy="130" rx="10" ry="4" fill="#739f73" transform="rotate(20 112 130)" />
          </motion.g>
        </>
      )}

      {stage >= 2 && (
        <>
          {/* Side branches */}
          <motion.path
            d="M100 110 Q80 100 65 92"
            stroke="#406843"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ ...pathTransition, delay: delay + 0.9 }}
          />
          <motion.path
            d="M100 110 Q120 100 135 92"
            stroke="#406843"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ ...pathTransition, delay: delay + 0.9 }}
          />

          {/* True leaves */}
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...popTransition, delay: delay + 1.2 }}
            style={{ transformOrigin: '65px 92px' }}
          >
            <Leaf cx={56} cy={88} rotate={-35} size={14} />
          </motion.g>
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...popTransition, delay: delay + 1.2 }}
            style={{ transformOrigin: '135px 92px' }}
          >
            <Leaf cx={144} cy={88} rotate={35} size={14} />
          </motion.g>
        </>
      )}

      {stage >= 3 && (
        <>
          {/* Upper leaves */}
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...popTransition, delay: delay + 1.4 }}
            style={{ transformOrigin: '100px 80px' }}
          >
            <Leaf cx={85} cy={72} rotate={-50} size={12} />
            <Leaf cx={115} cy={72} rotate={50} size={12} />
            <Leaf cx={100} cy={62} rotate={0} size={10} />
          </motion.g>

          {/* Flowers */}
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...popTransition, delay: delay + 1.6 }}
            style={{ transformOrigin: '100px 100px' }}
          >
            <Flower cx={75} cy={100} />
            <Flower cx={125} cy={100} />
          </motion.g>

          {/* Peppers (pods) */}
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...popTransition, delay: delay + 1.8 }}
            style={{ transformOrigin: '100px 120px' }}
          >
            <Pepper cx={70} cy={108} rotate={-15} />
            <Pepper cx={130} cy={108} rotate={15} />
            <Pepper cx={92} cy={130} rotate={-5} small />
          </motion.g>
        </>
      )}
    </svg>
  );
}

function Leaf({
  cx,
  cy,
  rotate,
  size,
}: {
  cx: number;
  cy: number;
  rotate: number;
  size: number;
}) {
  return (
    <g transform={`rotate(${rotate} ${cx} ${cy})`}>
      <ellipse cx={cx} cy={cy} rx={size} ry={size * 0.5} fill="#548255" />
      <path
        d={`M${cx - size} ${cy} Q${cx} ${cy - 2} ${cx + size} ${cy}`}
        stroke="#243827"
        strokeWidth="0.6"
        fill="none"
      />
    </g>
  );
}

function Flower({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx - 3} cy={cy - 2} r="2.2" fill="#faf5e8" />
      <circle cx={cx + 3} cy={cy - 2} r="2.2" fill="#faf5e8" />
      <circle cx={cx} cy={cy - 4} r="2.2" fill="#faf5e8" />
      <circle cx={cx} cy={cy + 1} r="2.2" fill="#faf5e8" />
      <circle cx={cx} cy={cy - 1.5} r="1.3" fill="#d4a957" />
    </g>
  );
}

function Pepper({
  cx,
  cy,
  rotate,
  small,
}: {
  cx: number;
  cy: number;
  rotate: number;
  small?: boolean;
}) {
  const w = small ? 4 : 5;
  const h = small ? 10 : 14;
  return (
    <g transform={`rotate(${rotate} ${cx} ${cy})`}>
      <path
        d={`M${cx} ${cy - h * 0.4}
           Q${cx + w} ${cy - h * 0.2} ${cx + w * 0.6} ${cy + h * 0.5}
           Q${cx} ${cy + h * 0.7} ${cx - w * 0.6} ${cy + h * 0.5}
           Q${cx - w} ${cy - h * 0.2} ${cx} ${cy - h * 0.4} Z`}
        fill="#e23e1d"
      />
      <path
        d={`M${cx - 2} ${cy - h * 0.4} L${cx + 2} ${cy - h * 0.4}`}
        stroke="#406843"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </g>
  );
}
