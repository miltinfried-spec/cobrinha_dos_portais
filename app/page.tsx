'use client';
// ============================================================
// Página raíz — renderiza o componente do jogo
// ============================================================
import dynamic from 'next/dynamic';

const GameApp = dynamic(() => import('@/components/game/game-app'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-bounce">🐍</div>
        <p className="text-white text-lg font-display">Carregando...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <GameApp />;
}
