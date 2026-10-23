import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { menuNavigation } from '../services/menuNavigation';
import { NativeBridge } from '../services/nativeBridge';
import { soundManager } from '../services/soundManager';
import { adService } from '../services/ads/adService';

interface ModeItem {
  id: string;
  label: string;
  color: string;
  desc: string;
  isDirectStart?: boolean;
}

interface DifficultyItem {
  diff: 'easy' | 'medium' | 'hard';
  label: string;
  color: string;
  desc: string;
}

const MODES: ModeItem[] = [
  { id: 'classic', label: 'CLASSIC 10', color: '#6366f1', desc: 'Original reaction challenge' },
  { id: 'memory', label: 'MEMORY FLASH', color: '#ec4899', desc: 'Recall the sequence' },
  { id: 'attack', label: 'TIME ATTACK', color: '#f59e0b', desc: '30 seconds to peak score' },
  { id: 'crazy', label: 'CRAZY MODE', color: '#f43f5e', desc: 'High-speed erratic targets', isDirectStart: true },
  { id: 'super_crazy', label: 'MASOCHIST MODE', color: '#991b1b', desc: 'Absolute reflex limit', isDirectStart: true }
];

const DIFFICULTIES: DifficultyItem[] = [
  { diff: 'easy', label: 'EASY', color: '#10b981', desc: 'Slower tempo, longer flash time' },
  { diff: 'medium', label: 'MEDIUM', color: '#6366f1', desc: 'Balanced reflex challenge' },
  { diff: 'hard', label: 'HARD', color: '#f43f5e', desc: 'Insane speed, rapid grid expansion' }
];

export const MainMenuButtons: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [entranceKey, setEntranceKey] = useState(0);
  const [view, setView] = useState<'modes' | 'difficulty'>('modes');
  const [selectedMode, setSelectedMode] = useState<string>('');
  const [scores, setScores] = useState<Record<string, string>>({});
  const [diffScores, setDiffScores] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubscribe = menuNavigation.subscribe(() => {
      setIsVisible(menuNavigation.isMenuVisible());
      setEntranceKey(menuNavigation.getEntranceKey());
      setView(menuNavigation.getCurrentView());
      setSelectedMode(menuNavigation.getSelectedMode());
    });
    return unsubscribe;
  }, []);

  // Fetch real scores on menu entrance or view change
  useEffect(() => {
    if (!isVisible) return;

    if (view === 'modes') {
      loadModeScores();
    } else if (view === 'difficulty' && selectedMode) {
      loadDiffScores(selectedMode);
    }
  }, [isVisible, view, entranceKey, selectedMode]);

  const loadModeScores = async () => {
    try {
      const latestRecordMode = await NativeBridge.getLatestRecordMode();
      const newScores: Record<string, string> = {};

      for (const m of MODES) {
        const score = await NativeBridge.getHighScore(m.id);
        let formatted = (m.id === 'attack' || m.id === 'crazy' || m.id === 'super_crazy')
          ? (score > 0 ? `BEST: ${score}` : 'BEST: -')
          : (score > 0 ? `BEST: ${score.toFixed(2)}s` : 'BEST: -');

        if (latestRecordMode === m.id && score > 0) {
          formatted = `🏆 RECORD: ${formatted.replace('BEST: ', '')} 🏆`;
        }
        newScores[m.id] = formatted;
      }

      setScores(newScores);
    } catch {
      // Ignore score fetch error
    }
  };

  const loadDiffScores = async (mode: string) => {
    try {
      const isTimeBased = mode === 'classic' || mode === 'memory';
      const latestRecordMode = await NativeBridge.getLatestRecordMode();
      const newDiffScores: Record<string, string> = {};

      for (const d of DIFFICULTIES) {
        const diffScore = await NativeBridge.getHighScore(mode, d.diff);
        let formatted = diffScore > 0
          ? (isTimeBased ? `BEST: ${diffScore.toFixed(2)}s` : `BEST: ${diffScore}`)
          : 'BEST: -';

        if (latestRecordMode === mode && diffScore > 0) {
          formatted = `🏆 RECORD: ${formatted.replace('BEST: ', '')} 🏆`;
        }
        newDiffScores[d.diff] = formatted;
      }

      setDiffScores(newDiffScores);
    } catch {
      // Ignore diff score error
    }
  };

  const handleModeClick = async (m: ModeItem) => {
    if (m.isDirectStart) {
      const seen = await NativeBridge.hasSeenTraining();
      if (!seen) {
        soundManager.playSelect();
        NativeBridge.hapticLight();
        menuNavigation.startTraining();
      } else {
        soundManager.playStart();
        NativeBridge.hapticMedium();
        menuNavigation.startGame(m.id, 'hard');
      }
    } else {
      soundManager.playSelect();
      NativeBridge.hapticLight();
      menuNavigation.showDifficulty(m.id);
    }
  };

  const handleDifficultyClick = (diff: 'easy' | 'medium' | 'hard') => {
    soundManager.playStart();
    NativeBridge.hapticMedium();
    menuNavigation.startGame(selectedMode, diff);
  };

  const handleBackToModes = () => {
    soundManager.playSelect();
    NativeBridge.hapticLight();
    menuNavigation.backToModes();
  };

  // Framer Motion Animation Variants for Staggered Entrance
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.075,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: 0.04,
        staggerDirection: -1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 26, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        damping: 18,
        stiffness: 270,
      },
    },
    exit: {
      opacity: 0,
      y: -18,
      scale: 0.96,
      transition: { duration: 0.2 },
    },
  };

  if (!isVisible) return null;

  const isNative = adService.isNativeEnvironment();

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-center items-center">
      {/* Positioned right below Daily Mission widget */}
      <div className="w-[88%] max-w-md pointer-events-auto mt-20 md:mt-28">
        <AnimatePresence mode="wait">
          {view === 'modes' ? (
            /* Mode Selection Buttons with Staggered Entrance */
            <motion.div
              key={`modes-list-${entranceKey}`}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col gap-2 md:gap-2.5"
            >
              {MODES.map((m) => {
                const scoreText = scores[m.id] || 'BEST: -';
                const isRecord = scoreText.includes('RECORD');

                return (
                  <motion.button
                    key={m.id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.025, x: 4, transition: { duration: 0.14 } }}
                    whileTap={{ scale: 0.97 }}
                    onMouseEnter={() => soundManager.playHover()}
                    onClick={() => handleModeClick(m)}
                    className="group relative flex items-center justify-between px-3.5 py-2.5 md:py-3.5 rounded-2xl bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 hover:border-white/15 backdrop-blur-md shadow-lg transition-colors cursor-pointer text-left overflow-hidden"
                  >
                    {/* Left Neon Accent Bar */}
                    <div
                      className="w-1 h-7 rounded-full mr-3.5 flex-shrink-0"
                      style={{ backgroundColor: m.color }}
                    />

                    {/* Title & Description */}
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="text-base font-black italic tracking-wide text-white font-['Barlow_Condensed'] group-hover:text-indigo-200 transition-colors">
                        {m.label}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-400 truncate">
                        {m.desc}
                      </div>
                    </div>

                    {/* High Score / Record Tag */}
                    <div
                      className={`text-[11px] font-black tracking-wider flex-shrink-0 ${
                        isRecord ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    >
                      {scoreText}
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            /* Difficulty Selection Buttons with Staggered Entrance */
            <motion.div
              key={`diff-list-${entranceKey}`}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col gap-3"
            >
              <motion.div variants={itemVariants} className="text-center mb-1">
                <span className="text-[11px] font-black tracking-widest uppercase text-slate-400">
                  CHOOSE DIFFICULTY
                </span>
              </motion.div>

              {DIFFICULTIES.map((d) => {
                const diffScoreText = diffScores[d.diff] || 'BEST: -';

                return (
                  <motion.button
                    key={d.diff}
                    variants={itemVariants}
                    whileHover={{ scale: 1.025, x: 4, transition: { duration: 0.14 } }}
                    whileTap={{ scale: 0.97 }}
                    onMouseEnter={() => soundManager.playHover()}
                    onClick={() => handleDifficultyClick(d.diff)}
                    className="group relative flex items-center justify-between px-5 py-4 rounded-2xl bg-slate-900/50 hover:bg-slate-800/70 border border-white/10 hover:border-white/20 backdrop-blur-md shadow-lg transition-colors cursor-pointer text-left overflow-hidden"
                  >
                    {/* Left Accent Pill */}
                    <div
                      className="w-1.5 h-8 rounded-full mr-3.5 flex-shrink-0"
                      style={{ backgroundColor: d.color }}
                    />

                    {/* Label & Description */}
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="text-base font-black italic tracking-wide text-white font-['Barlow_Condensed']">
                        {d.label}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-400 truncate">
                        {d.desc}
                      </div>
                    </div>

                    {/* Best Score */}
                    <div className="text-xs font-black text-slate-300 flex-shrink-0">
                      {diffScoreText}
                    </div>
                  </motion.button>
                );
              })}

              {/* Back to Modes Button */}
              <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleBackToModes}
                className="mt-3 py-2 text-center text-xs font-black tracking-widest uppercase text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                ← BACK TO MODES
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Dock */}
      <div className={`absolute ${!isNative ? 'bottom-[72px]' : 'bottom-6'} left-0 right-0 pointer-events-auto flex justify-center items-center gap-3 px-4 z-30 transition-all duration-300`}>
        <button
          onClick={() => {
            soundManager.playSelect();
            NativeBridge.hapticLight();
            const game = menuNavigation.getGame();
            if (game) {
              const scene = game.scene.getScene('MenuScene') as any;
              if (scene && scene.showMissionsOverlay) {
                scene.showMissionsOverlay();
              }
            }
          }}
          className="px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-indigo-500/40 hover:border-indigo-500/80 backdrop-blur-md text-[10px] font-black tracking-widest text-white shadow-xl transition-all cursor-pointer"
        >
          MISSIONS
        </button>

        <button
          onClick={() => {
            soundManager.playSelect();
            NativeBridge.hapticLight();
            const game = menuNavigation.getGame();
            if (game) {
              const scene = game.scene.getScene('MenuScene') as any;
              if (scene && scene.cameras) {
                scene.cameras.main.fadeOut(300, 2, 6, 23);
                scene.cameras.main.once('camerafadeoutcomplete', () => {
                  scene.scene.start('TrainingScene');
                });
              }
            }
          }}
          className="px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-pink-500/40 hover:border-pink-500/80 backdrop-blur-md text-[10px] font-black tracking-widest text-slate-300 hover:text-white shadow-xl transition-all cursor-pointer"
        >
          TRAINING
        </button>
      </div>
    </div>
  );
};
