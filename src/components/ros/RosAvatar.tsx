import { Flower2 } from 'lucide-react';

/**
 * Rós-merki — lítið rósarþema í paprikulitum á mosagrunni.
 * Notar lucide 'Flower2' í hringlaga litaslá úr terracotta/capsicum á mosa/cream.
 */
export function RosAvatar({ size = 36 }: { size?: number }) {
  const icon = Math.round(size * 0.55);
  return (
    <span
      className="inline-flex items-center justify-center shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background:
          'radial-gradient(circle at 30% 25%, rgba(239,90,60,.95), rgba(194,106,77,.9) 45%, rgba(64,104,67,.95) 100%)',
        border: '1px solid rgba(231,217,168,.35)',
        boxShadow: '0 2px 10px rgba(226,62,29,.25)',
      }}
      aria-hidden
    >
      <Flower2 size={icon} color="var(--cream-50)" strokeWidth={2} />
    </span>
  );
}
