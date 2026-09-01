// ============================================================
// Motor do jogo — lógica pura (sem React)
// Gerencia cobra, frutas, obstáculos, portal, colisões
// ============================================================
import type { Point, Direction, Fruit, Obstacle, Portal, GameState, LevelTheme } from './types';
import { FRUIT_CONFIGS, pickFruitType } from './fruit-config';
import { getLevelConfig } from './level-config';

const INITIAL_LENGTH = 3;
const MAX_FRUITS = 3;

/** Direções opostas — cobra não pode inverter */
const OPPOSITE: Record<Direction, Direction> = {
  UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT',
};

/** Vetor de movimento por direção */
const DELTA: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

/** Cria estado inicial para um nível */
export function createGameState(levelId: number): GameState {
  const cfg = getLevelConfig(levelId);
  const startX = Math.floor(cfg.gridCols / 2);
  const startY = Math.floor(cfg.gridRows / 2);

  const snake: Point[] = [];
  for (let i = 0; i < INITIAL_LENGTH; i++) {
    snake.push({ x: startX - i, y: startY });
  }

  const obstacles: Obstacle[] = (cfg?.obstacles ?? []).map((o: any) => ({
    pos: { x: o?.x ?? 0, y: o?.y ?? 0 },
    mobile: o?.mobile ?? false,
    direction: o?.direction,
    speed: o?.speed ?? 1000,
    lastMove: 0,
    emoji: o?.emoji ?? '🪨',
  }));

  const state: GameState = {
    snake,
    direction: 'RIGHT',
    nextDirection: 'RIGHT',
    fruits: [],
    obstacles,
    portal: null,
    score: 0,
    level: levelId,
    isAlive: true,
    portalReached: false,
    isPaused: false,
    lastMoveTime: 0,
    initialLength: INITIAL_LENGTH,
  };

  // Coloca fruta inicial
  spawnFruit(state, cfg);

  return state;
}

/** Tenta mudar direção (respeita regra de não inverter) */
export function setDirection(state: GameState, dir: Direction): void {
  if (!state || !dir) return;
  if (OPPOSITE[dir] === state.direction) return;
  state.nextDirection = dir;
}

/** Passo principal do jogo — chame a cada `speed` ms */
export function tick(state: GameState, now: number): {
  ate: boolean;
  died: boolean;
  portalEntered: boolean;
  portalSpawned: boolean;
  fruitType?: string;
} {
  if (!state?.isAlive || state?.isPaused) {
    return { ate: false, died: false, portalEntered: false, portalSpawned: false };
  }

  const cfg = getLevelConfig(state.level);
  state.direction = state.nextDirection;

  // Mover obstáculos móveis
  moveObstacles(state, cfg, now);

  // Mover cobra
  const head = state.snake[0];
  const delta = DELTA[state.direction];
  const newHead: Point = {
    x: (head?.x ?? 0) + (delta?.x ?? 0),
    y: (head?.y ?? 0) + (delta?.y ?? 0),
  };

  // Checar colisão com paredes
  if (newHead.x < 0 || newHead.x >= cfg.gridCols ||
      newHead.y < 0 || newHead.y >= cfg.gridRows) {
    state.isAlive = false;
    return { ate: false, died: true, portalEntered: false, portalSpawned: false };
  }

  // Checar colisão com obstáculos
  for (const obs of (state.obstacles ?? [])) {
    if (obs?.pos?.x === newHead.x && obs?.pos?.y === newHead.y) {
      state.isAlive = false;
      return { ate: false, died: true, portalEntered: false, portalSpawned: false };
    }
  }

  // Checar colisão com corpo (excluir último segmento pois vai se mover)
  for (let i = 0; i < (state.snake?.length ?? 0) - 1; i++) {
    const seg = state.snake?.[i];
    if (seg?.x === newHead.x && seg?.y === newHead.y) {
      state.isAlive = false;
      return { ate: false, died: true, portalEntered: false, portalSpawned: false };
    }
  }

  // Mover cobra
  state.snake.unshift(newHead);

  // Checar portal
  if (state.portal && newHead.x === state.portal?.pos?.x && newHead.y === state.portal?.pos?.y) {
    state.portalReached = true;
    return { ate: false, died: false, portalEntered: true, portalSpawned: false };
  }

  // Checar fruta
  let ate = false;
  let ateType: string | undefined;
  const fruitIdx = (state.fruits ?? []).findIndex(
    (f: Fruit) => f?.pos?.x === newHead.x && f?.pos?.y === newHead.y
  );

  if (fruitIdx >= 0) {
    const fruit = state.fruits[fruitIdx];
    const config = FRUIT_CONFIGS[fruit?.type ?? 'apple'];
    state.score += config?.points ?? 10;
    ate = true;
    ateType = fruit?.type;

    const grow = config?.growAmount ?? 1;
    if (grow > 0) {
      // Manter cauda (não remover segmentos) por `grow` ticks
      for (let i = 0; i < grow; i++) {
        const tail = state.snake[state.snake.length - 1];
        state.snake.push({ x: tail?.x ?? 0, y: tail?.y ?? 0 });
      }
    } else if (grow < 0) {
      // Encolher (uva especial) mas não menor que tamanho inicial
      const removeCount = Math.min(Math.abs(grow), (state.snake?.length ?? INITIAL_LENGTH) - state.initialLength);
      for (let i = 0; i < removeCount; i++) {
        state.snake.pop();
      }
    }
    // Sem crescimento: remover cauda normalmente
    if (grow <= 0) {
      // Cauda já foi tratada acima; remover o extra que foi adicionado por unshift
    }

    state.fruits.splice(fruitIdx, 1);
  } else {
    // Não comeu: remover cauda (cobra avanca)
    state.snake.pop();
  }

  // Remover frutas expiradas
  state.fruits = (state.fruits ?? []).filter((f: Fruit) => {
    if ((f?.lifetime ?? 0) <= 0) return true;
    return (now - (f?.spawnTime ?? 0)) < (f?.lifetime ?? 0);
  });

  // Spawn novas frutas
  while ((state.fruits?.length ?? 0) < MAX_FRUITS) {
    const spawned = spawnFruit(state, cfg);
    if (!spawned) break;
  }

  // Checar se portal deve aparecer
  let portalSpawned = false;
  if (!state.portal && state.score >= cfg.targetScore) {
    const portalPos = findFreeCell(state, cfg);
    if (portalPos) {
      state.portal = { pos: portalPos, animPhase: 0 };
      portalSpawned = true;
    }
  }

  state.lastMoveTime = now;
  return { ate, died: false, portalEntered: false, portalSpawned, fruitType: ateType };
}

/** Move obstáculos móveis */
function moveObstacles(state: GameState, cfg: LevelTheme, now: number): void {
  for (const obs of (state.obstacles ?? [])) {
    if (!obs?.mobile || !obs?.direction) continue;
    const spd = obs?.speed ?? 1000;
    if (now - (obs?.lastMove ?? 0) < spd) continue;
    obs.lastMove = now;

    const d = DELTA[obs.direction];
    const nx = (obs.pos?.x ?? 0) + (d?.x ?? 0);
    const ny = (obs.pos?.y ?? 0) + (d?.y ?? 0);

    // Se sairia da grade, inverte direção
    if (nx < 1 || nx >= cfg.gridCols - 1 || ny < 1 || ny >= cfg.gridRows - 1) {
      obs.direction = OPPOSITE[obs.direction];
    } else {
      // Não mover para cima da cobra ou de outro obstáculo
      const blocked = (state.obstacles ?? []).some(
        (o: Obstacle) => o !== obs && o?.pos?.x === nx && o?.pos?.y === ny
      );
      if (!blocked) {
        obs.pos = { x: nx, y: ny };
      } else {
        obs.direction = OPPOSITE[obs.direction];
      }
    }
  }
}

/** Encontra célula livre no grid */
function findFreeCell(state: GameState, cfg: LevelTheme): Point | null {
  const occupied = new Set<string>();

  for (const seg of (state.snake ?? [])) {
    occupied.add(`${seg?.x ?? 0},${seg?.y ?? 0}`);
  }
  for (const f of (state.fruits ?? [])) {
    occupied.add(`${f?.pos?.x ?? 0},${f?.pos?.y ?? 0}`);
  }
  for (const o of (state.obstacles ?? [])) {
    occupied.add(`${o?.pos?.x ?? 0},${o?.pos?.y ?? 0}`);
  }
  if (state.portal) {
    occupied.add(`${state.portal?.pos?.x ?? 0},${state.portal?.pos?.y ?? 0}`);
  }

  // Tentar posições aleatórias primeiro (rápido)
  for (let attempt = 0; attempt < 100; attempt++) {
    const x = Math.floor(Math.random() * cfg.gridCols);
    const y = Math.floor(Math.random() * cfg.gridRows);
    if (!occupied.has(`${x},${y}`)) {
      return { x, y };
    }
  }

  // Fallback: busca linear
  for (let x = 0; x < cfg.gridCols; x++) {
    for (let y = 0; y < cfg.gridRows; y++) {
      if (!occupied.has(`${x},${y}`)) return { x, y };
    }
  }
  return null;
}

/** Spawn uma fruta em posição livre */
function spawnFruit(state: GameState, cfg: LevelTheme): boolean {
  const pos = findFreeCell(state, cfg);
  if (!pos) return false;

  const fruitType = pickFruitType(cfg?.fruitTypes ?? ['apple']);
  const config = FRUIT_CONFIGS[fruitType];

  state.fruits.push({
    pos,
    type: config?.type ?? 'apple',
    spawnTime: Date.now(),
    lifetime: config?.lifetime ?? 0,
  });
  return true;
}
