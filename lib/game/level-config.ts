// ============================================================
// Configuração dos 5 Níveis — ALTERE AQUI para customizar
// ============================================================
import type { LevelTheme } from './types';

/**
 * Para adicionar um novo nível:
 * 1. Copie um nível existente
 * 2. Altere id (sequencial), name, cores, obstáculos, meta e velocidade
 * 3. Adicione ao array LEVELS
 * 4. O jogo detectará automaticamente o novo nível
 */
export const LEVELS: LevelTheme[] = [
  // ─── Nível 1: Jardim ───────────────────────────────
  {
    id: 1,
    name: 'Jardim',
    subtitle: 'Um lugar tranquilo para começar',
    targetScore: 100,
    speed: 180,
    gridCols: 17,
    gridRows: 17,
    bgColor: '#86EFAC',
    bgColor2: '#4ADE80',
    wallColor: '#166534',
    snakeColor: '#15803D',
    snakeHeadColor: '#14532D',
    obstacleEmojis: ['🪨', '🌿'],
    obstacles: [
      { x: 4, y: 4, mobile: false, emoji: '🪨' },
      { x: 12, y: 4, mobile: false, emoji: '🌿' },
      { x: 4, y: 12, mobile: false, emoji: '🌿' },
      { x: 12, y: 12, mobile: false, emoji: '🪨' },
      { x: 8, y: 8, mobile: false, emoji: '🪨' },
    ],
    fruitTypes: ['apple', 'banana'],
    portalColor: '#A855F7',
    portalGlow: '#C084FC',
    description: 'Cenário verde e alegre com poucos obstáculos.',
  },
  // ─── Nível 2: Floresta Encantada ───────────────────
  {
    id: 2,
    name: 'Floresta Encantada',
    subtitle: 'Cuidado com as árvores!',
    targetScore: 150,
    speed: 160,
    gridCols: 17,
    gridRows: 17,
    bgColor: '#065F46',
    bgColor2: '#047857',
    wallColor: '#422006',
    snakeColor: '#34D399',
    snakeHeadColor: '#10B981',
    obstacleEmojis: ['🌳', '🪵', '🪨'],
    obstacles: [
      { x: 3, y: 3, mobile: false, emoji: '🌳' },
      { x: 13, y: 3, mobile: false, emoji: '🌳' },
      { x: 3, y: 13, mobile: false, emoji: '🌳' },
      { x: 13, y: 13, mobile: false, emoji: '🌳' },
      { x: 8, y: 5, mobile: false, emoji: '🪵' },
      { x: 8, y: 11, mobile: false, emoji: '🪵' },
      { x: 5, y: 8, mobile: false, emoji: '🪨' },
      { x: 11, y: 8, mobile: false, emoji: '🪨' },
      { x: 6, y: 6, mobile: false, emoji: '🌳' },
      { x: 10, y: 10, mobile: false, emoji: '🌳' },
    ],
    fruitTypes: ['apple', 'banana', 'grape'],
    portalColor: '#8B5CF6',
    portalGlow: '#A78BFA',
    description: 'Floresta densa com mais obstáculos e frutas especiais.',
  },
  // ─── Nível 3: Deserto Dourado ──────────────────────
  {
    id: 3,
    name: 'Deserto Dourado',
    subtitle: 'O calor não para a cobra!',
    targetScore: 200,
    speed: 150,
    gridCols: 17,
    gridRows: 17,
    bgColor: '#FDE68A',
    bgColor2: '#FBBF24',
    wallColor: '#92400E',
    snakeColor: '#D97706',
    snakeHeadColor: '#B45309',
    obstacleEmojis: ['🌵', '🪨'],
    obstacles: [
      { x: 4, y: 4, mobile: false, emoji: '🌵' },
      { x: 12, y: 4, mobile: false, emoji: '🌵' },
      { x: 8, y: 2, mobile: false, emoji: '🪨' },
      { x: 4, y: 12, mobile: false, emoji: '🌵' },
      { x: 12, y: 12, mobile: false, emoji: '🌵' },
      { x: 8, y: 14, mobile: false, emoji: '🪨' },
      // Obstáculos móveis!
      { x: 2, y: 8, mobile: true, emoji: '🪨', direction: 'RIGHT', speed: 800 },
      { x: 14, y: 6, mobile: true, emoji: '🪨', direction: 'LEFT', speed: 900 },
    ],
    fruitTypes: ['apple', 'banana', 'grape', 'golden'],
    portalColor: '#F59E0B',
    portalGlow: '#FCD34D',
    description: 'Deserto com cactos e alguns obstáculos que se movem!',
  },
  // ─── Nível 4: Mundo de Gelo ────────────────────────
  {
    id: 4,
    name: 'Mundo de Gelo',
    subtitle: 'O chão é escorregadio!',
    targetScore: 250,
    speed: 140,
    gridCols: 17,
    gridRows: 17,
    bgColor: '#BFDBFE',
    bgColor2: '#93C5FD',
    wallColor: '#1E3A5F',
    snakeColor: '#3B82F6',
    snakeHeadColor: '#1D4ED8',
    obstacleEmojis: ['🧊', '💎'],
    obstacles: [
      { x: 3, y: 3, mobile: false, emoji: '🧊' },
      { x: 13, y: 3, mobile: false, emoji: '💎' },
      { x: 3, y: 13, mobile: false, emoji: '💎' },
      { x: 13, y: 13, mobile: false, emoji: '🧊' },
      { x: 8, y: 8, mobile: false, emoji: '🧊' },
      { x: 6, y: 5, mobile: false, emoji: '🧊' },
      { x: 10, y: 11, mobile: false, emoji: '🧊' },
      { x: 5, y: 10, mobile: true, emoji: '🧊', direction: 'RIGHT', speed: 700 },
      { x: 11, y: 6, mobile: true, emoji: '🧊', direction: 'DOWN', speed: 750 },
    ],
    fruitTypes: ['apple', 'banana', 'grape', 'golden'],
    portalColor: '#38BDF8',
    portalGlow: '#7DD3FC',
    description: 'Mundo gelado com leve deslizamento e cristais de gelo.',
  },
  // ─── Nível 5: Espaço ──────────────────────────────
  {
    id: 5,
    name: 'Espaço',
    subtitle: 'A fronteira final!',
    targetScore: 300,
    speed: 125,
    gridCols: 17,
    gridRows: 17,
    bgColor: '#0F172A',
    bgColor2: '#1E293B',
    wallColor: '#6366F1',
    snakeColor: '#818CF8',
    snakeHeadColor: '#6366F1',
    obstacleEmojis: ['☄️', '🪐'],
    obstacles: [
      { x: 4, y: 3, mobile: false, emoji: '🪐' },
      { x: 12, y: 13, mobile: false, emoji: '🪐' },
      { x: 8, y: 8, mobile: false, emoji: '🪐' },
      { x: 2, y: 7, mobile: true, emoji: '☄️', direction: 'RIGHT', speed: 600 },
      { x: 14, y: 10, mobile: true, emoji: '☄️', direction: 'LEFT', speed: 550 },
      { x: 7, y: 2, mobile: true, emoji: '☄️', direction: 'DOWN', speed: 650 },
      { x: 10, y: 14, mobile: true, emoji: '☄️', direction: 'UP', speed: 700 },
    ],
    fruitTypes: ['apple', 'banana', 'grape', 'golden'],
    portalColor: '#A855F7',
    portalGlow: '#E879F9',
    description: 'Espaço profundo com meteoros em movimento!',
  },
];

export function getLevelConfig(levelId: number): LevelTheme {
  return LEVELS?.find((l: LevelTheme) => l?.id === levelId) ?? LEVELS[0];
}

export const TOTAL_LEVELS = LEVELS?.length ?? 5;
