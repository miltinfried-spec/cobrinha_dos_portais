'use client';
// ============================================================
// Componente principal do jogo — gerencia todas as telas e o canvas
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GameScreen, GameState, PlayerSettings, Direction } from '@/lib/game/types';
import { createGameState, setDirection, tick } from '@/lib/game/engine';
import { renderGame } from '@/lib/game/renderer';
import { getLevelConfig, LEVELS, TOTAL_LEVELS } from '@/lib/game/level-config';
import {
  loadSave, saveSave, unlockLevel, saveBestScore,
  saveSettings, saveLastLevel, resetAllProgress,
} from '@/lib/game/storage';
import {
  sfxEat, sfxGolden, sfxDeath, sfxClick,
  sfxPortalAppear, sfxPortalEnter,
  vibrate, startMusic, stopMusic,
} from '@/lib/game/audio';
import { FRUIT_CONFIGS } from '@/lib/game/fruit-config';

// ────────────────────────────────────────────────────────
export default function GameApp() {
  const [screen, setScreen] = useState<GameScreen>('home');
  const [settings, setSettings] = useState<PlayerSettings>(() => loadSave()?.settings ?? {
    musicOn: true, sfxOn: true, vibrationOn: true, controlMode: 'swipe',
  });
  const [highestLevel, setHighestLevel] = useState<number>(1);
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [bestScores, setBestScores] = useState<Record<number, number>>({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const gameStateRef = useRef<GameState | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Carregar dados salvos ao montar
  useEffect(() => {
    const save = loadSave();
    setHighestLevel(save?.highestLevel ?? 1);
    setCurrentLevel(save?.lastLevel ?? 1);
    setBestScores(save?.bestScores ?? {});
    setSettings(save?.settings ?? {
      musicOn: true, sfxOn: true, vibrationOn: true, controlMode: 'swipe',
    });
  }, []);

  // Música
  useEffect(() => {
    if (settings?.musicOn && screen === 'playing') {
      startMusic();
    } else {
      stopMusic();
    }
    return () => { stopMusic(); };
  }, [settings?.musicOn, screen]);

  // ─── Game Loop ─────────────────────────────────────────
  const gameLoop = useCallback((timestamp: number) => {
    const gs = gameStateRef.current;
    if (!gs || !gs.isAlive || gs.portalReached) {
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    if (gs.isPaused) {
      // Ainda renderiza mas não faz tick
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) renderGame(ctx, gs, canvas.width, canvas.height, timestamp);
      }
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const cfg = getLevelConfig(gs.level);
    const elapsed = timestamp - lastTickRef.current;

    if (elapsed >= cfg.speed) {
      lastTickRef.current = timestamp;
      const result = tick(gs, timestamp);

      if (result?.died) {
        if (settings?.sfxOn) sfxDeath();
        if (settings?.vibrationOn) vibrate(200);
        setFinalScore(gs.score);
        saveBestScore(gs.level, gs.score);
        setBestScores(prev => ({
          ...(prev ?? {}),
          [gs.level]: Math.max(prev?.[gs.level] ?? 0, gs.score),
        }));
        setScreen('death');
      } else if (result?.portalEntered) {
        if (settings?.sfxOn) sfxPortalEnter();
        if (settings?.vibrationOn) vibrate(100);
        saveBestScore(gs.level, gs.score);
        const nextLevel = gs.level + 1;
        if (nextLevel <= TOTAL_LEVELS) {
          const save = unlockLevel(nextLevel);
          setHighestLevel(save?.highestLevel ?? nextLevel);
        } else {
          unlockLevel(gs.level); // último nível já desbloqueado
        }
        setFinalScore(gs.score);
        setCurrentLevel(gs.level);
        setScreen('levelComplete');
      } else {
        if (result?.ate && settings?.sfxOn) {
          if (result?.fruitType === 'golden') sfxGolden();
          else sfxEat();
        }
        if (result?.portalSpawned) {
          if (settings?.sfxOn) sfxPortalAppear();
          if (settings?.vibrationOn) vibrate(50);
        }
      }
    }

    // Render
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) renderGame(ctx, gs, canvas.width, canvas.height, timestamp);
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [settings]);

  // Iniciar/parar loop
  useEffect(() => {
    if (screen === 'playing') {
      lastTickRef.current = performance.now();
      animFrameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [screen, gameLoop]);

  // ─── Controles ─────────────────────────────────────────
  const handleDirection = useCallback((dir: Direction) => {
    const gs = gameStateRef.current;
    if (gs && gs.isAlive && !gs.isPaused) {
      setDirection(gs, dir);
    }
  }, []);

  // Teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (screen !== 'playing') return;
      const gs = gameStateRef.current;
      if (!gs) return;
      const key = e.key?.toLowerCase?.() ?? '';
      if (key === 'arrowup' || key === 'w') { e.preventDefault(); handleDirection('UP'); }
      else if (key === 'arrowdown' || key === 's') { e.preventDefault(); handleDirection('DOWN'); }
      else if (key === 'arrowleft' || key === 'a') { e.preventDefault(); handleDirection('LEFT'); }
      else if (key === 'arrowright' || key === 'd') { e.preventDefault(); handleDirection('RIGHT'); }
      else if (key === 'escape' || key === 'p') {
        e.preventDefault();
        if (gs) gs.isPaused = !gs.isPaused;
        if (gs?.isPaused) setScreen('paused');
        else setScreen('playing');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, handleDirection]);

  // Touch (swipe)
  useEffect(() => {
    if (screen !== 'playing' || settings?.controlMode !== 'swipe') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onStart = (e: TouchEvent) => {
      const t = e.touches?.[0];
      if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
    };
    const onEnd = (e: TouchEvent) => {
      const start = touchStartRef.current;
      const t = e.changedTouches?.[0];
      if (!start || !t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const MIN_SWIPE = 20;
      if (Math.abs(dx) < MIN_SWIPE && Math.abs(dy) < MIN_SWIPE) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        handleDirection(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        handleDirection(dy > 0 ? 'DOWN' : 'UP');
      }
      touchStartRef.current = null;
    };

    canvas.addEventListener('touchstart', onStart, { passive: true });
    canvas.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchend', onEnd);
    };
  }, [screen, settings?.controlMode, handleDirection]);

  // ─── Ações ───────────────────────────────────────────
  const startLevel = useCallback((level: number) => {
    if (settings?.sfxOn) sfxClick();
    const gs = createGameState(level);
    gameStateRef.current = gs;
    setCurrentLevel(level);
    saveLastLevel(level);
    setScreen('playing');
  }, [settings]);

  const continueGame = useCallback(() => {
    const save = loadSave();
    startLevel(save?.lastLevel ?? 1);
  }, [startLevel]);

  const togglePause = useCallback(() => {
    const gs = gameStateRef.current;
    if (!gs) return;
    gs.isPaused = !gs.isPaused;
    setScreen(gs.isPaused ? 'paused' : 'playing');
  }, []);

  const goHome = useCallback(() => {
    if (settings?.sfxOn) sfxClick();
    gameStateRef.current = null;
    setScreen('home');
  }, [settings]);

  const nextLevel = useCallback(() => {
    if (settings?.sfxOn) sfxClick();
    const next = currentLevel + 1;
    if (next <= TOTAL_LEVELS) {
      startLevel(next);
    } else {
      setScreen('home');
    }
  }, [currentLevel, startLevel, settings]);

  const updateSettings = useCallback((partial: Partial<PlayerSettings>) => {
    setSettings((prev: PlayerSettings) => {
      const next = { ...(prev ?? {}), ...partial } as PlayerSettings;
      saveSettings(next);
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    resetAllProgress();
    setHighestLevel(1);
    setCurrentLevel(1);
    setBestScores({});
    setShowResetConfirm(false);
    setScreen('home');
  }, []);

  // ─── Canvas sizing ─────────────────────────────────────
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 340, h: 340 });

  useEffect(() => {
    const resize = () => {
      const container = canvasContainerRef.current;
      if (!container) return;
      const w = container.clientWidth;
      const maxH = window.innerHeight * 0.58;
      const size = Math.min(w, maxH);
      setCanvasSize({ w: Math.floor(size), h: Math.floor(size) });
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [screen]);

  // ─── Renders das telas ─────────────────────────────────
  const gs = gameStateRef.current;
  const cfg = gs ? getLevelConfig(gs.level) : null;

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950 text-white overflow-hidden select-none"
      style={{ touchAction: 'none' }}>

      {/* ========== HOME ========== */}
      {screen === 'home' && (
        <div className="flex flex-col items-center justify-center flex-1 px-4 gap-4 animate-fadeIn">
          <div className="text-5xl mb-1">🐍</div>
          <h1 className="text-3xl font-bold tracking-tight font-display bg-gradient-to-r from-green-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
            Cobrinha dos Portais
          </h1>
          <p className="text-sm text-purple-300 opacity-80 mb-4">Nível mais alto: {highestLevel} / {TOTAL_LEVELS}</p>

          <button onClick={continueGame}
            className="w-64 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 font-bold text-lg shadow-lg hover:scale-105 active:scale-95 transition-transform">
            ▶️ Jogar
          </button>
          <button onClick={() => { if (settings?.sfxOn) sfxClick(); setScreen('levelSelect'); }}
            className="w-64 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 font-bold shadow-lg hover:scale-105 active:scale-95 transition-transform">
            🗺️ Selecionar Nível
          </button>
          <button onClick={() => { if (settings?.sfxOn) sfxClick(); setScreen('howToPlay'); }}
            className="w-64 py-2.5 rounded-xl bg-white/10 font-medium hover:bg-white/20 transition">
            ❓ Como Jogar
          </button>
          <button onClick={() => { if (settings?.sfxOn) sfxClick(); setScreen('settings'); }}
            className="w-64 py-2.5 rounded-xl bg-white/10 font-medium hover:bg-white/20 transition">
            ⚙️ Configurações
          </button>
        </div>
      )}

      {/* ========== LEVEL SELECT ========== */}
      {screen === 'levelSelect' && (
        <div className="flex flex-col flex-1 px-4 py-6 gap-3 animate-fadeIn">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={goHome} className="text-2xl p-1 hover:scale-110 transition">⬅️</button>
            <h2 className="text-2xl font-bold font-display">Selecionar Nível</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 overflow-y-auto flex-1 pb-4">
            {(LEVELS ?? []).map((lvl: any) => {
              const unlocked = lvl?.id <= highestLevel;
              const best = bestScores?.[lvl?.id] ?? 0;
              return (
                <button
                  key={lvl?.id}
                  disabled={!unlocked}
                  onClick={() => unlocked && startLevel(lvl?.id)}
                  className={`relative flex items-center gap-4 p-4 rounded-2xl transition-all ${
                    unlocked
                      ? 'bg-white/10 hover:bg-white/20 active:scale-[0.98]'
                      : 'bg-white/5 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: unlocked ? lvl?.bgColor : '#333' }}>
                    {unlocked ? (lvl?.id === 1 ? '🌿' : lvl?.id === 2 ? '🌳' : lvl?.id === 3 ? '🏜️' : lvl?.id === 4 ? '❄️' : '🌌') : '🔒'}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold">{lvl?.name ?? 'Nível'}</div>
                    <div className="text-xs text-purple-300">{lvl?.subtitle ?? ''}</div>
                    {unlocked && best > 0 && (
                      <div className="text-xs text-yellow-400 mt-0.5">⭐ Melhor: {best}</div>
                    )}
                  </div>
                  <div className="text-sm text-purple-400">Meta: {lvl?.targetScore}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========== HOW TO PLAY ========== */}
      {screen === 'howToPlay' && (
        <div className="flex flex-col flex-1 px-5 py-6 gap-4 animate-fadeIn overflow-y-auto">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={goHome} className="text-2xl p-1">⬅️</button>
            <h2 className="text-2xl font-bold font-display">Como Jogar</h2>
          </div>
          <div className="space-y-3 text-sm leading-relaxed">
            <InfoCard emoji="🐍" title="Controle a Cobra" text="Deslize o dedo ou use os botões direcionais para mover a cobra. No computador, use as setas ou WASD." />
            <InfoCard emoji="🍎" title="Coma as Frutas" text="Cada fruta dá pontos diferentes: Maçã (10pts), Banana (20pts, some rápido!), Uva (15pts, encolhe!), Dourada (50pts, rara!)." />
            <InfoCard emoji="🌀" title="Encontre o Portal" text="Ao atingir a meta de pontos, um portal brilhante aparece. Atravesse-o para desbloquear o próximo nível!" />
            <InfoCard emoji="⚠️" title="Cuidado!" text="Não bata nas paredes, obstáculos ou no próprio corpo. Se morrer, o nível reinicia mas seus níveis desbloqueados são mantidos." />
            <InfoCard emoji="💾" title="Progresso Salvo" text="Seu progresso é salvo automaticamente. Níveis desbloqueados ficam disponíveis para sempre!" />
          </div>
        </div>
      )}

      {/* ========== SETTINGS ========== */}
      {screen === 'settings' && (
        <div className="flex flex-col flex-1 px-5 py-6 gap-4 animate-fadeIn">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={goHome} className="text-2xl p-1">⬅️</button>
            <h2 className="text-2xl font-bold font-display">Configurações</h2>
          </div>
          <div className="space-y-3">
            <ToggleRow label="🎵 Música" value={settings?.musicOn ?? true}
              onChange={(v: boolean) => updateSettings({ musicOn: v })} />
            <ToggleRow label="🔊 Efeitos Sonoros" value={settings?.sfxOn ?? true}
              onChange={(v: boolean) => updateSettings({ sfxOn: v })} />
            <ToggleRow label="📳 Vibração" value={settings?.vibrationOn ?? true}
              onChange={(v: boolean) => updateSettings({ vibrationOn: v })} />
            <div className="bg-white/10 rounded-xl p-4 flex items-center justify-between">
              <span className="font-medium">🎮 Controles</span>
              <div className="flex gap-2">
                <button onClick={() => updateSettings({ controlMode: 'swipe' })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    settings?.controlMode === 'swipe' ? 'bg-green-500' : 'bg-white/10'
                  }`}>Deslizar</button>
                <button onClick={() => updateSettings({ controlMode: 'buttons' })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    settings?.controlMode === 'buttons' ? 'bg-green-500' : 'bg-white/10'
                  }`}>Botões</button>
              </div>
            </div>

            <div className="pt-4">
              {!showResetConfirm ? (
                <button onClick={() => setShowResetConfirm(true)}
                  className="w-full py-3 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition">
                  🗑️ Apagar Todo Progresso
                </button>
              ) : (
                <div className="bg-red-500/20 p-4 rounded-xl space-y-3">
                  <p className="text-sm text-red-300">Tem certeza? Todo progresso será perdido permanentemente!</p>
                  <div className="flex gap-3">
                    <button onClick={handleReset}
                      className="flex-1 py-2 rounded-lg bg-red-600 font-bold">Confirmar</button>
                    <button onClick={() => setShowResetConfirm(false)}
                      className="flex-1 py-2 rounded-lg bg-white/10">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== PLAYING / PAUSED ========== */}
      {(screen === 'playing' || screen === 'paused') && gs && cfg && (
        <div className="flex flex-col flex-1 items-center">
          {/* HUD */}
          <div className="w-full px-3 py-2 flex items-center justify-between" style={{ maxWidth: 500 }}>
            <div className="text-sm">
              <span className="opacity-70">Nível {gs.level}</span>
              <span className="ml-2 font-bold">{cfg.name}</span>
            </div>
            <button onClick={togglePause}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-lg">
              {screen === 'paused' ? '▶️' : '⏸️'}
            </button>
          </div>

          {/* Pontução */}
          <div className="w-full px-3 flex items-center gap-3" style={{ maxWidth: 500 }}>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span>⭐ {gs.score}</span>
                <span>Meta: {cfg.targetScore}</span>
              </div>
              <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (gs.score / cfg.targetScore) * 100)}%`,
                    background: gs.score >= cfg.targetScore
                      ? `linear-gradient(90deg, ${cfg.portalColor}, ${cfg.portalGlow})`
                      : 'linear-gradient(90deg, #22c55e, #10b981)',
                  }} />
              </div>
            </div>
            {gs.portal && (
              <span className="text-lg animate-pulse">🌀</span>
            )}
          </div>

          {/* Canvas */}
          <div ref={canvasContainerRef} className="flex-1 w-full flex items-center justify-center px-2 py-2"
            style={{ maxWidth: 500 }}>
            <canvas
              ref={canvasRef}
              width={canvasSize.w}
              height={canvasSize.h}
              className="rounded-xl shadow-2xl"
              style={{ width: canvasSize.w, height: canvasSize.h, imageRendering: 'pixelated' }}
            />
          </div>

          {/* Botões direcionais (modo buttons) */}
          {settings?.controlMode === 'buttons' && screen === 'playing' && (
            <div className="pb-4 pt-1">
              <div className="grid grid-cols-3 gap-1 w-40 mx-auto">
                <div />
                <DPadBtn dir="UP" label="▲" onPress={handleDirection} />
                <div />
                <DPadBtn dir="LEFT" label="◀" onPress={handleDirection} />
                <div />
                <DPadBtn dir="RIGHT" label="▶" onPress={handleDirection} />
                <div />
                <DPadBtn dir="DOWN" label="▼" onPress={handleDirection} />
                <div />
              </div>
            </div>
          )}

          {/* Overlay de pausa */}
          {screen === 'paused' && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
              <div className="bg-slate-900/95 p-8 rounded-2xl text-center space-y-4 mx-4">
                <h2 className="text-2xl font-bold">⏸️ Pausado</h2>
                <button onClick={togglePause}
                  className="w-full py-3 rounded-xl bg-green-500 font-bold text-lg">Continuar</button>
                <button onClick={goHome}
                  className="w-full py-2 rounded-xl bg-white/10">Menu Principal</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== DEATH ========== */}
      {screen === 'death' && (
        <div className="flex flex-col items-center justify-center flex-1 px-6 gap-4 animate-fadeIn">
          <div className="text-5xl mb-2">😵</div>
          <h2 className="text-2xl font-bold font-display">Ops! Você bateu!</h2>
          <p className="text-purple-300">Pontuação: <span className="text-yellow-400 font-bold text-xl">{finalScore}</span></p>
          <div className="w-64 space-y-3 mt-2">
            <button onClick={() => startLevel(currentLevel)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 font-bold text-lg shadow-lg">
              🔄 Tentar Novamente
            </button>
            <button onClick={() => { if (settings?.sfxOn) sfxClick(); setScreen('levelSelect'); }}
              className="w-full py-2.5 rounded-xl bg-white/10 font-medium">
              🗺️ Escolher Nível
            </button>
            <button onClick={goHome}
              className="w-full py-2.5 rounded-xl bg-white/10 font-medium">
              🏠 Menu Principal
            </button>
          </div>
        </div>
      )}

      {/* ========== LEVEL COMPLETE ========== */}
      {screen === 'levelComplete' && (
        <div className="flex flex-col items-center justify-center flex-1 px-6 gap-4 animate-fadeIn">
          <div className="text-6xl animate-bounce">🎉</div>
          <h2 className="text-2xl font-bold font-display bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
            Nível Concluído!
          </h2>
          <p className="text-purple-300">Você completou o nível <span className="font-bold text-white">{getLevelConfig(currentLevel)?.name}</span></p>
          <p className="text-yellow-400 font-bold text-xl">⭐ {finalScore} pontos</p>

          {currentLevel < TOTAL_LEVELS && (
            <div className="bg-white/10 p-3 rounded-xl text-center">
              <p className="text-sm text-green-400">Novo nível desbloqueado!</p>
              <p className="font-bold text-lg">{getLevelConfig(currentLevel + 1)?.name}</p>
            </div>
          )}
          {currentLevel >= TOTAL_LEVELS && (
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-4 rounded-xl text-center">
              <p className="text-yellow-300 font-bold">🏆 Parabéns! Você completou todos os níveis!</p>
            </div>
          )}

          <div className="w-64 space-y-3 mt-2">
            {currentLevel < TOTAL_LEVELS ? (
              <button onClick={nextLevel}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 font-bold text-lg shadow-lg">
                ➡️ Próximo Nível
              </button>
            ) : (
              <button onClick={goHome}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-600 font-bold text-lg shadow-lg">
                🏆 Menu Principal
              </button>
            )}
            <button onClick={goHome}
              className="w-full py-2.5 rounded-xl bg-white/10 font-medium">
              🏠 Menu Principal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes ───────────────────────────────────────
function InfoCard({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <div className="bg-white/10 p-4 rounded-xl flex gap-3">
      <span className="text-2xl">{emoji}</span>
      <div>
        <h3 className="font-bold text-sm">{title}</h3>
        <p className="text-xs text-purple-200 mt-0.5">{text}</p>
      </div>
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="bg-white/10 rounded-xl p-4 flex items-center justify-between">
      <span className="font-medium">{label}</span>
      <button onClick={() => onChange(!value)}
        className={`w-12 h-7 rounded-full transition-colors relative ${
          value ? 'bg-green-500' : 'bg-white/20'
        }`}>
        <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0.5'
        }`} />
      </button>
    </div>
  );
}

function DPadBtn({ dir, label, onPress }: { dir: Direction; label: string; onPress: (d: Direction) => void }) {
  return (
    <button
      onTouchStart={(e) => { e.preventDefault(); onPress(dir); }}
      onClick={() => onPress(dir)}
      className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/15 active:bg-white/30 text-xl font-bold transition select-none"
    >
      {label}
    </button>
  );
}
