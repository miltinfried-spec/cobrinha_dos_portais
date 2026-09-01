// ============================================================
// Renderizador Canvas — desenha tudo no canvas 2D
// ============================================================
import type { GameState, LevelTheme, Point } from './types';
import { FRUIT_CONFIGS } from './fruit-config';
import { getLevelConfig } from './level-config';

/** Desenha o jogo inteiro no canvas */
export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasWidth: number,
  canvasHeight: number,
  animTime: number
): void {
  if (!ctx || !state) return;

  const cfg = getLevelConfig(state.level);
  const cellW = canvasWidth / cfg.gridCols;
  const cellH = canvasHeight / cfg.gridRows;

  // Limpar e desenhar fundo
  drawBackground(ctx, cfg, canvasWidth, canvasHeight, cellW, cellH, animTime);

  // Obstáculos
  drawObstacles(ctx, state, cellW, cellH);

  // Frutas
  drawFruits(ctx, state, cellW, cellH, animTime);

  // Portal
  if (state.portal) {
    drawPortal(ctx, state.portal.pos, cfg, cellW, cellH, animTime);
  }

  // Cobra
  drawSnake(ctx, state, cfg, cellW, cellH, animTime);
}

// ─── Fundo ──────────────────────────────────────────────────
function drawBackground(
  ctx: CanvasRenderingContext2D,
  cfg: LevelTheme,
  w: number, h: number,
  cellW: number, cellH: number,
  animTime: number
) {
  ctx.fillStyle = cfg.bgColor;
  ctx.fillRect(0, 0, w, h);

  // Padrão de grid sutil
  ctx.fillStyle = cfg.bgColor2;
  for (let x = 0; x < cfg.gridCols; x++) {
    for (let y = 0; y < cfg.gridRows; y++) {
      if ((x + y) % 2 === 0) {
        ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
      }
    }
  }

  // Estrelas no nível Espaço
  if (cfg.id === 5) {
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 30; i++) {
      const sx = ((i * 137 + 50) % w);
      const sy = ((i * 97 + 30) % h);
      const size = 1 + (Math.sin(animTime * 0.003 + i) * 0.5 + 0.5);
      ctx.globalAlpha = 0.3 + Math.sin(animTime * 0.002 + i * 0.5) * 0.3;
      ctx.fillRect(sx, sy, size, size);
    }
    ctx.globalAlpha = 1;
  }

  // Borda/parede
  ctx.strokeStyle = cfg.wallColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(1, 1, w - 2, h - 2);
}

// ─── Cobra ──────────────────────────────────────────────────
function drawSnake(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cfg: LevelTheme,
  cellW: number, cellH: number,
  _animTime: number
) {
  const snake = state?.snake ?? [];
  if (snake.length === 0) return;

  // Corpo
  for (let i = snake.length - 1; i >= 1; i--) {
    const seg = snake[i];
    const alpha = 0.6 + (0.4 * (1 - i / snake.length));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = cfg.snakeColor;
    const pad = cellW * 0.08;
    roundRect(ctx, (seg?.x ?? 0) * cellW + pad, (seg?.y ?? 0) * cellH + pad, cellW - pad * 2, cellH - pad * 2, 4);
  }
  ctx.globalAlpha = 1;

  // Cabeça
  const head = snake[0];
  const hx = (head?.x ?? 0) * cellW;
  const hy = (head?.y ?? 0) * cellH;
  ctx.fillStyle = cfg.snakeHeadColor;
  roundRect(ctx, hx + 1, hy + 1, cellW - 2, cellH - 2, 5);

  // Olhos
  const eyeSize = Math.max(2, cellW * 0.15);
  ctx.fillStyle = '#FFFFFF';
  const eyeOffX = cellW * 0.25;
  const eyeOffY = cellH * 0.25;
  let e1x = hx + eyeOffX;
  let e1y = hy + eyeOffY;
  let e2x = hx + cellW - eyeOffX - eyeSize;
  let e2y = hy + eyeOffY;

  if (state.direction === 'UP') {
    e1x = hx + eyeOffX; e1y = hy + eyeOffY;
    e2x = hx + cellW - eyeOffX - eyeSize; e2y = hy + eyeOffY;
  } else if (state.direction === 'DOWN') {
    e1x = hx + eyeOffX; e1y = hy + cellH - eyeOffY - eyeSize;
    e2x = hx + cellW - eyeOffX - eyeSize; e2y = hy + cellH - eyeOffY - eyeSize;
  } else if (state.direction === 'LEFT') {
    e1x = hx + eyeOffX; e1y = hy + eyeOffY;
    e2x = hx + eyeOffX; e2y = hy + cellH - eyeOffY - eyeSize;
  } else if (state.direction === 'RIGHT') {
    e1x = hx + cellW - eyeOffX - eyeSize; e1y = hy + eyeOffY;
    e2x = hx + cellW - eyeOffX - eyeSize; e2y = hy + cellH - eyeOffY - eyeSize;
  }

  ctx.beginPath();
  ctx.arc(e1x + eyeSize / 2, e1y + eyeSize / 2, eyeSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(e2x + eyeSize / 2, e2y + eyeSize / 2, eyeSize, 0, Math.PI * 2);
  ctx.fill();

  // Pupilas
  ctx.fillStyle = '#1a1a2e';
  const pupilSize = eyeSize * 0.5;
  ctx.beginPath();
  ctx.arc(e1x + eyeSize / 2, e1y + eyeSize / 2, pupilSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(e2x + eyeSize / 2, e2y + eyeSize / 2, pupilSize, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Obstáculos ────────────────────────────────────────────
function drawObstacles(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cellW: number, cellH: number
) {
  for (const obs of (state?.obstacles ?? [])) {
    const x = (obs?.pos?.x ?? 0) * cellW;
    const y = (obs?.pos?.y ?? 0) * cellH;
    const emoji = obs?.emoji ?? '🪨';
    ctx.font = `${Math.floor(Math.min(cellW, cellH) * 0.75)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x + cellW / 2, y + cellH / 2 + 1);
  }
}

// ─── Frutas ───────────────────────────────────────────────
function drawFruits(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cellW: number, cellH: number,
  animTime: number
) {
  for (const fruit of (state?.fruits ?? [])) {
    const config = FRUIT_CONFIGS[fruit?.type ?? 'apple'];
    const x = (fruit?.pos?.x ?? 0) * cellW;
    const y = (fruit?.pos?.y ?? 0) * cellH;

    // Brilho especial para dourada
    if (fruit?.type === 'golden') {
      const glowSize = 4 + Math.sin(animTime * 0.005) * 2;
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = glowSize * 3;
    }

    // Pulse de fruta com tempo limitado (piscar quando está acabando)
    const lifetime = fruit?.lifetime ?? 0;
    let alpha = 1;
    if (lifetime > 0) {
      const elapsed = Date.now() - (fruit?.spawnTime ?? 0);
      const remaining = lifetime - elapsed;
      if (remaining < 2000) {
        alpha = 0.3 + Math.abs(Math.sin(animTime * 0.01)) * 0.7;
      }
    }

    ctx.globalAlpha = alpha;
    const bounce = Math.sin(animTime * 0.004 + (fruit?.pos?.x ?? 0)) * 2;
    ctx.font = `${Math.floor(Math.min(cellW, cellH) * 0.7)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config?.emoji ?? '🍎', x + cellW / 2, y + cellH / 2 + bounce);

    ctx.globalAlpha = 1;
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
}

// ─── Portal ────────────────────────────────────────────────
function drawPortal(
  ctx: CanvasRenderingContext2D,
  pos: Point,
  cfg: LevelTheme,
  cellW: number, cellH: number,
  animTime: number
) {
  const cx = (pos?.x ?? 0) * cellW + cellW / 2;
  const cy = (pos?.y ?? 0) * cellH + cellH / 2;
  const baseRadius = Math.min(cellW, cellH) * 0.4;
  const pulse = Math.sin(animTime * 0.005) * 3;

  // Glow externo
  ctx.shadowColor = cfg.portalGlow;
  ctx.shadowBlur = 15 + pulse * 2;

  // Anel externo
  ctx.strokeStyle = cfg.portalColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, baseRadius + pulse, 0, Math.PI * 2);
  ctx.stroke();

  // Preencher centro
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius);
  grad.addColorStop(0, cfg.portalGlow + 'CC');
  grad.addColorStop(0.7, cfg.portalColor + '88');
  grad.addColorStop(1, cfg.portalColor + '00');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, baseRadius + pulse, 0, Math.PI * 2);
  ctx.fill();

  // Espiral interna
  ctx.strokeStyle = '#FFFFFF88';
  ctx.lineWidth = 1.5;
  const spiralAngle = animTime * 0.003;
  ctx.beginPath();
  for (let i = 0; i < 20; i++) {
    const a = spiralAngle + i * 0.3;
    const r = (i / 20) * baseRadius * 0.8;
    const sx = cx + Math.cos(a) * r;
    const sy = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

// ─── Utilitários de desenho ───────────────────────────────────
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}
