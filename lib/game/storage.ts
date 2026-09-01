// ============================================================
// Gerenciador de LocalStorage — progresso, configs, pontuações
// ============================================================
import type { SaveData, PlayerSettings } from './types';

const STORAGE_KEY = 'cobrinha_dos_portais_save';

const DEFAULT_SETTINGS: PlayerSettings = {
  musicOn: true,
  sfxOn: true,
  vibrationOn: true,
  controlMode: 'swipe',
};

const DEFAULT_SAVE: SaveData = {
  highestLevel: 1,
  bestScores: {},
  lastLevel: 1,
  settings: { ...DEFAULT_SETTINGS },
};

/** Carrega dados salvos (retorna padrão se não existirem) */
export function loadSave(): SaveData {
  if (typeof window === 'undefined') return { ...DEFAULT_SAVE };
  try {
    const raw = localStorage?.getItem?.(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE, settings: { ...DEFAULT_SETTINGS } };
    const parsed = JSON.parse(raw);
    return {
      highestLevel: parsed?.highestLevel ?? 1,
      bestScores: parsed?.bestScores ?? {},
      lastLevel: parsed?.lastLevel ?? 1,
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed?.settings ?? {}),
      },
    };
  } catch {
    return { ...DEFAULT_SAVE, settings: { ...DEFAULT_SETTINGS } };
  }
}

/** Salva dados */
export function saveSave(data: SaveData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage?.setItem?.(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage cheio — silenciar
  }
}

/** Desbloqueia próximo nível se necessário */
export function unlockLevel(level: number): SaveData {
  const save = loadSave();
  if (level > (save?.highestLevel ?? 1)) {
    save.highestLevel = level;
  }
  saveSave(save);
  return save;
}

/** Registra melhor pontuação de um nível */
export function saveBestScore(level: number, score: number): SaveData {
  const save = loadSave();
  const current = save?.bestScores?.[level] ?? 0;
  if (score > current) {
    save.bestScores[level] = score;
  }
  saveSave(save);
  return save;
}

/** Atualiza configurações */
export function saveSettings(settings: PlayerSettings): void {
  const save = loadSave();
  save.settings = { ...DEFAULT_SETTINGS, ...(settings ?? {}) };
  saveSave(save);
}

/** Salva último nível jogado */
export function saveLastLevel(level: number): void {
  const save = loadSave();
  save.lastLevel = level;
  saveSave(save);
}

/** Apaga todo o progresso (com confirmação já feita pelo UI) */
export function resetAllProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage?.removeItem?.(STORAGE_KEY);
  } catch {
    // silenciar
  }
}
