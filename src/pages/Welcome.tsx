import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { GrowingPlant } from '@/components/GrowingPlant';
import { Button } from '@/components/ui/Button';

export function Welcome() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
    >
      {/* Decorative background glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, delay: 0.2 }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-moss-500/20 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-terracotta-500/15 blur-3xl" />
      </motion.div>

      <div className="relative flex flex-col items-center max-w-md text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <GrowingPlant size={260} delay={0.3} stage={3} />
        </motion.div>

        {/* Textinn og „Byrja"-hnappurinn birtast snemma (innan ~0.8s) svo
            notandi geti haldið áfram strax — plöntu-hreyfingin heldur áfram á bak
            við (1.4). */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center gap-2 mb-3 text-xs uppercase tracking-[0.2em] text-moss-300"
        >
          <Sparkles size={14} />
          <span>Inniræktun, frá fræi til uppskeru</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="heading text-5xl sm:text-6xl font-semibold text-cream-50 mb-4"
        >
          Spíra
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-cream-200/80 text-lg leading-relaxed mb-10"
        >
          Grow-dagbók fyrir piparræktun og aðra inniræktun á Íslandi. Skráðu fasa,
          vökvun, uppskeru — og horfðu á plönturnar vaxa.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex flex-col items-center gap-3 w-full"
        >
          <Button
            size="lg"
            onClick={() => navigate('/setup')}
            className="w-full sm:w-auto min-w-[240px]"
          >
            Byrja
            <ArrowRight size={18} />
          </Button>
          <p className="text-cream-400/50 text-xs">
            Gögnin þín eru aðeins geymd í þessum vafra
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
