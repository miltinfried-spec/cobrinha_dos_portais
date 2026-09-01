// ============================================================
// Configuração das frutas — altere pontos, crescimento, etc.
// ============================================================
import type { FruitConfig } from './types';

export const FRUIT_CONFIGS: Record<string, FruitConfig> = {
  apple: {
    type: 'apple',
    points: 10,
    growAmount: 1,
    lifetime: 0,        // permanente
    spawnWeight: 50,
    emoji: '🍎',
    color: '#EF4444',
    label: 'Maçã',
  },
  banana: {
    type: 'banana',
    points: 20,
    growAmount: 1,
    lifetime: 6000,     // desaparece em 6s
    spawnWeight: 25,
    emoji: '🍌',
    color: '#FBBF24',
    label: 'Banana',
  },
  grape: {
    type: 'grape',
    points: 15,
    growAmount: -1,     // encolhe 1 segmento
    lifetime: 8000,
    spawnWeight: 15,
    emoji: '🍇',
    color: '#8B5CF6',
    label: 'Uva Especial',
  },
  golden: {
    type: 'golden',
    points: 50,
    growAmount: 1,
    lifetime: 4000,     // rara e breve
    spawnWeight: 5,
    emoji: '⭐',
    color: '#F59E0B',
    label: 'Fruta Dourada',
  },
};

/** Escolhe tipo de fruta aleatoriamente com base nos pesos */
export function pickFruitType(allowed: string[]): string {
  const configs = allowed?.map((t: string) => FRUIT_CONFIGS[t])?.filter(Boolean) ?? [];
  if (configs?.length === 0) return 'apple';
  const totalWeight = configs.reduce((sum: number, c: FruitConfig) => sum + (c?.spawnWeight ?? 0), 0);
  let r = Math.random() * totalWeight;
  for (const c of configs) {
    r -= c?.spawnWeight ?? 0;
    if (r <= 0) return c?.type ?? 'apple';
  }
  return configs[configs.length - 1]?.type ?? 'apple';
}
