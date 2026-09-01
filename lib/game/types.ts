// ============================================================
// Tipos TypeScript para o jogo Cobrinha dos Portais
// ============================================================

/** Coordenada em grade (coluna, linha) */
export interface Point {
  x: number;
  y: number;
}

/** Direções possíveis */
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

/** Tipos de fruta disponíveis */
export type FruitType = 'apple' | 'banana' | 'grape' | 'golden';

/** Fruta no tabuleiro */
export interface Fruit {
  pos: Point;
  type: FruitType;
  spawnTime: number;   // timestamp de quando apareceu
  lifetime: number;    // ms — 0 = sem limite
}

/** Configuração de cada tipo de fruta */
export interface FruitConfig {
  type: FruitType;
  points: number;
  growAmount: number;     // segmentos a crescer (negativo = encolher)
  lifetime: number;       // ms, 0 = permanente
  spawnWeight: number;    // probabilidade relativa
  emoji: string;
  color: string;
  label: string;
}

/** Obstáculo (posição fixa ou móvel) */
export interface Obstacle {
  pos: Point;
  mobile: boolean;
  direction?: Direction;
  speed?: number;        // ms entre movimentos (só para móveis)
  lastMove?: number;
  emoji: string;
}

/** Portal para próximo nível */
export interface Portal {
  pos: Point;
  animPhase: number;
}

/** Estado de um nível */
export interface LevelTheme {
  id: number;
  name: string;
  subtitle: string;
  targetScore: number;
  speed: number;           // ms entre movimentos da cobra
  gridCols: number;
  gridRows: number;
  bgColor: string;
  bgColor2: string;
  wallColor: string;
  snakeColor: string;
  snakeHeadColor: string;
  obstacleEmojis: string[];
  obstacles: { x: number; y: number; mobile: boolean; emoji?: string; direction?: Direction; speed?: number }[];
  fruitTypes: FruitType[];
  portalColor: string;
  portalGlow: string;
  description: string;
}

/** Tela ativa do jogo */
export type GameScreen = 
  | 'home'
  | 'levelSelect'
  | 'howToPlay'
  | 'settings'
  | 'playing'
  | 'paused'
  | 'death'
  | 'levelComplete';

/** Configurações do jogador */
export interface PlayerSettings {
  musicOn: boolean;
  sfxOn: boolean;
  vibrationOn: boolean;
  controlMode: 'swipe' | 'buttons';
}

/** Dados salvos */
export interface SaveData {
  highestLevel: number;         // maior nível desbloqueado (1-based)
  bestScores: Record<number, number>; // melhor pontuação por nível
  lastLevel: number;            // último nível jogado
  settings: PlayerSettings;
}

/** Estado completo do jogo em execução */
export interface GameState {
  snake: Point[];
  direction: Direction;
  nextDirection: Direction;
  fruits: Fruit[];
  obstacles: Obstacle[];
  portal: Portal | null;
  score: number;
  level: number;
  isAlive: boolean;
  portalReached: boolean;
  isPaused: boolean;
  lastMoveTime: number;
  initialLength: number;
}
