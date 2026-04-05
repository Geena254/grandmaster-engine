import React, { useEffect, useState, useRef } from 'react';
import Phaser from 'phaser';
import { ChessScene } from './game/ChessScene';
import { GameUI } from './components/GameUI';
import { Volume2, VolumeX, RotateCcw } from 'lucide-react';

export default function App() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('chess_muted') === 'true';
  });
  const [gameState, setGameState] = useState({
    turn: 'white',
    isCheck: false,
    isCheckmate: false,
    winner: null as string | null,
    moveHistory: [] as string[]
  });

  useEffect(() => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: 600,
      height: 600,
      backgroundColor: '#242424',
      scene: [ChessScene],
      physics: {
        default: 'arcade',
        arcade: { debug: false }
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Listen for scene events
    game.events.on('update-ui', (data: any) => {
      setGameState(prev => ({ ...prev, ...data }));
    });

    return () => {
      game.destroy(true);
    };
  }, []);

  const toggleMute = () => {
    const newMute = !isMuted;
    setIsMuted(newMute);
    localStorage.setItem('chess_muted', String(newMute));
    if (gameRef.current) {
      gameRef.current.events.emit('toggle-mute', newMute);
    }
  };

  const handleReset = () => {
    if (gameRef.current) {
      gameRef.current.events.emit('reset-game');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center p-4 font-sans">
      <header className="w-full max-w-2xl flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent">
            Grandmaster Chess
          </h1>
          <p className="text-neutral-400 text-sm">Classic Strategy Engine</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={handleReset}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-full transition-colors"
            title="Reset Game"
          >
            <RotateCcw size={20} />
          </button>
          <button 
            onClick={toggleMute}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-full transition-colors"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
      </header>

      <main className="relative flex flex-col md:flex-row gap-8 items-start justify-center w-full max-w-6xl">
        <div className="relative group border-8 border-neutral-800 rounded-lg shadow-2xl overflow-hidden">
          <div id="game-container" className="w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] md:w-[600px] md:h-[600px]" />
          
          {gameState.isCheckmate && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center animate-in fade-in duration-500">
              <h2 className="text-4xl font-black text-yellow-500 mb-2">CHECKMATE!</h2>
              <p className="text-xl mb-6 capitalize">{gameState.winner} wins the match</p>
              <button 
                onClick={handleReset}
                className="px-8 py-3 bg-yellow-600 hover:bg-yellow-500 rounded-full font-bold transition-transform active:scale-95"
              >
                Play Again
              </button>
            </div>
          )}
        </div>

        <GameUI gameState={gameState} />
      </main>

      <footer className="mt-auto pt-8 pb-4 text-neutral-500 text-xs">
        Built with Phaser 3 & React 19 • Professional Chess Engine Logic
      </footer>
    </div>
  );
}