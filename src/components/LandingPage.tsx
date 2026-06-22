import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- CUSTOM 3D-LAYERED ASSETS ---

const VectorBowlBack = () => (
  <svg viewBox="0 0 200 100" className="w-64 h-32 drop-shadow-md">
    <ellipse cx="100" cy="20" rx="90" ry="15" fill="#e2e8f0" />
    <ellipse cx="100" cy="22" rx="85" ry="12" fill="#cbd5e1" />
  </svg>
);

const VectorBowlFront = () => (
  <svg viewBox="0 0 200 100" className="w-64 h-32 drop-shadow-2xl">
    <path d="M 10 20 C 10 30 50 35 100 35 C 150 35 190 30 190 20 C 190 75 160 95 100 95 C 40 95 10 75 10 20 Z" fill="#f8fafc" stroke="#f97316" strokeWidth="3"/>
  </svg>
);

const VectorChopsticks = () => (
  <svg viewBox="0 0 100 150" className="w-24 h-36 drop-shadow-xl">
    {/* FIXED OPTICAL ILLUSION: Changed to off-white with dark slate bands so they don't blend into the orange background! */}
    <line x1="20" y1="130" x2="80" y2="10" stroke="#f8fafc" strokeWidth="7" strokeLinecap="round"/>
    <line x1="45" y1="135" x2="95" y2="25" stroke="#f8fafc" strokeWidth="7" strokeLinecap="round"/>
    <line x1="64" y1="40" x2="72" y2="36" stroke="#0f172a" strokeWidth="7"/>
    <line x1="78" y1="48" x2="86" y2="44" stroke="#0f172a" strokeWidth="7"/>
  </svg>
);

const VectorMaggi = () => (
  <svg viewBox="0 0 160 110" className="w-56 h-36 drop-shadow-lg">
    <path d="M10,60 C10,0 150,0 150,60 C150,100 110,105 80,105 C50,105 10,100 10,60 Z" fill="#fde047" />
    <path d="M20,40 Q40,15 60,40 T100,40 T140,40" stroke="#f59e0b" strokeWidth="4" fill="none" opacity="0.8"/>
    <path d="M15,65 Q35,40 55,65 T95,65 T135,65" stroke="#f59e0b" strokeWidth="4" fill="none" opacity="0.8"/>
    <path d="M25,90 Q45,65 65,90 T105,90 T125,90" stroke="#f59e0b" strokeWidth="4" fill="none" opacity="0.8"/>
    <path d="M60,25 Q75,5 90,25 T120,25" stroke="#f59e0b" strokeWidth="4" fill="none" opacity="0.8"/>
  </svg>
);

const VectorOnions = () => (
  <svg viewBox="0 0 120 80" className="w-32 h-20 drop-shadow-md">
    <ellipse cx="45" cy="45" rx="30" ry="15" fill="none" stroke="#db2777" strokeWidth="4"/>
    <ellipse cx="45" cy="45" rx="24" ry="11" fill="none" stroke="#fbcfe8" strokeWidth="3"/>
    <ellipse cx="75" cy="35" rx="35" ry="18" fill="none" stroke="#db2777" strokeWidth="4"/>
    <ellipse cx="75" cy="35" rx="28" ry="13" fill="none" stroke="#fbcfe8" strokeWidth="3"/>
    <ellipse cx="60" cy="20" rx="10" ry="5" fill="none" stroke="#16a34a" strokeWidth="4"/>
    <circle cx="60" cy="20" r="2" fill="#16a34a"/>
  </svg>
);

const dropPhysics = { 
  type: "tween", 
  ease: [0.22, 1, 0.36, 1], 
  duration: 0.8 
};

const BowlStack = ({ isHero = false, stage = 6 }) => (
  <div className={`relative w-64 h-[350px] flex justify-center ${isHero ? 'scale-110 sm:scale-125' : ''}`}>
    
    <AnimatePresence>
      {(stage >= 1 || isHero) && (
        <motion.div
          initial={!isHero ? { y: 150, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={dropPhysics}
          className="absolute bottom-[10px] z-10"
        >
          <VectorBowlBack />
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {(stage >= 2 || isHero) && (
        <motion.div
          initial={!isHero ? { y: -150, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={dropPhysics}
          className="absolute bottom-[35px] z-20"
        >
          <VectorMaggi />
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {(stage >= 3 || isHero) && (
        <motion.div
          initial={!isHero ? { y: -150, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={dropPhysics}
          className="absolute bottom-[45px] right-[40px] z-30"
        >
          <VectorChopsticks />
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {(stage >= 4 || isHero) && (
        <motion.div
          initial={!isHero ? { y: -150, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={dropPhysics}
          className="absolute bottom-[100px] z-40 ml-2"
        >
          <VectorOnions />
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {(stage >= 1 || isHero) && (
        <motion.div
          initial={!isHero ? { y: 150, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={dropPhysics}
          className="absolute bottom-[10px] z-50 pointer-events-none"
        >
          <VectorBowlFront />
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export function LandingPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 600);   
    const t2 = setTimeout(() => setStage(2), 1600);  
    const t3 = setTimeout(() => setStage(3), 2600);  
    const t4 = setTimeout(() => setStage(4), 3600);  
    const t5 = setTimeout(() => setStage(5), 4600);  
    const t6 = setTimeout(() => setStage(6), 5800);  

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); 
      clearTimeout(t4); clearTimeout(t5); clearTimeout(t6);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#1a1a1a] overflow-hidden font-sans selection:bg-orange-500 selection:text-white">
      
      <AnimatePresence>
        {stage < 6 && (
          <motion.div
            exit={{ y: '-100vh', transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } }}
            className="fixed inset-0 z-[100] bg-orange-500 flex flex-col items-center justify-center overflow-hidden"
          >
            <BowlStack stage={stage} />

            <div className="h-8 mt-6 overflow-hidden flex items-center justify-center relative w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={stage}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-white font-black tracking-widest uppercase text-sm sm:text-xl drop-shadow-md text-center absolute"
                >
                  {stage === 0 && "PREPARING THE KITCHEN..."}
                  {stage === 1 && "WARMING THE BOWL..."}
                  {stage === 2 && "DROPPING THE NOODLES..."}
                  {stage === 3 && "PREPPING CHOPSTICKS..."}
                  {stage === 4 && "SCATTERING ONIONS..."}
                  {stage === 5 && "READY TO CRAVE!"}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: stage >= 6 ? 1 : 0, y: stage >= 6 ? 0 : -20 }}
        transition={{ delay: 0.5 }}
        className="relative z-50 flex justify-between items-center p-4 sm:p-8"
      >
        <div className="flex items-center gap-1 sm:gap-2">
            <img 
                src="/logo.png" 
                alt="Maggino's Logo" 
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-lg" 
            />
            <span className="font-black text-xl sm:text-2xl tracking-tight text-white uppercase">Maggino's</span>
        </div>
        
        <button 
          onClick={() => navigate('/order')}
          className="bg-orange-500 hover:bg-slate-50 text-slate-900 px-4 py-2 sm:px-6 sm:py-3 rounded-full font-black text-xs sm:text-sm uppercase tracking-wider transition-colors shadow-lg flex items-center gap-1 sm:gap-2 group shrink-0"
        >
          Order Now <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.nav>

      <main className="relative flex-1 flex items-center justify-center min-h-[80vh]">
        
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none leading-[0.8] z-0">
          <motion.h1 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: stage >= 6 ? 1 : 0, y: stage >= 6 ? 0 : 40 }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
            className="text-[18vw] font-black text-slate-800 uppercase tracking-tighter"
          >
            THE MAGGI
          </motion.h1>
          <motion.h1 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: stage >= 6 ? 1 : 0, y: stage >= 6 ? 0 : 40 }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
            className="text-[18vw] font-black text-orange-500 uppercase tracking-tighter -mt-4 sm:-mt-10"
          >
            CRAVING
          </motion.h1>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: stage >= 6 ? 1 : 0, y: stage >= 6 ? 0 : 60 }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
          style={{ willChange: "transform, opacity" }}
          className="relative z-20 mt-10 group cursor-pointer"
          onClick={() => navigate('/order')}
        >
          <motion.div 
            animate={{ y: [0, -10, 0] }} 
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
            style={{ willChange: "transform" }}
          >
            <BowlStack isHero={true} />
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.1, rotate: -5 }}
            className="absolute top-10 -left-4 sm:-left-16 bg-yellow-400 text-slate-900 font-black uppercase text-xs sm:text-sm py-2 px-4 rounded-full border-2 border-slate-900 -rotate-12 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] z-60"
          >
            2 AM Savior!
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="absolute bottom-20 -right-4 sm:-right-10 bg-slate-900 text-orange-500 font-black uppercase text-xs sm:text-sm py-2 px-4 rounded-full border-2 border-orange-500 rotate-12 shadow-[4px_4px_0px_0px_rgba(249,115,22,1)] z-60"
          >
            Secret Seasoning
          </motion.div>
        </motion.div>

      </main>

      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: stage >= 6 ? 0 : 100 }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.6 }}
        className="absolute bottom-0 left-0 w-full bg-orange-500 text-slate-900 overflow-hidden py-4 border-t-4 border-slate-900 z-40"
      >
        <div className="whitespace-nowrap animate-marquee flex gap-8 items-center font-black uppercase tracking-widest text-sm">
          <span>🔥 HOT & FRESH TO YOUR ROOM</span>
          <span>•</span>
          <span>⏰ OPEN LATE NIGHT</span>
          <span>•</span>
          <span>🍜 10 MINUTE DELIVERY</span>
          <span>•</span>
          <span>🔥 HOT & FRESH TO YOUR ROOM</span>
          <span>•</span>
          <span>⏰ OPEN LATE NIGHT</span>
          <span>•</span>
          <span>🍜 10 MINUTE DELIVERY</span>
        </div>
      </motion.div>

    </div>
  );
}