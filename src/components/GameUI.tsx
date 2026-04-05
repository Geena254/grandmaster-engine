import React from 'react';
import { History, Target, ShieldAlert } from 'lucide-react';

interface GameUIProps {
  gameState: {
    turn: string;
    isCheck: boolean;
    isCheckmate: boolean;
    winner: string | null;
    moveHistory: string[];
  };
}

export const GameUI: React.FC<GameUIProps> = ({ gameState }) => {
  return (
    <div className="w-full md:w-80 flex flex-col gap-4">
      {/* Turn Indicator */}
      <div className="bg-neutral-800 p-4 rounded-xl shadow-lg border border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <span className="text-neutral-400 font-semibold uppercase tracking-wider text-xs flex items-center gap-2">
            <Target size={14} /> Current Turn
          </span>
          {gameState.isCheck && !gameState.isCheckmate && (
            <span className="flex items-center gap-1 text-red-500 animate-pulse font-bold text-xs uppercase">
              <ShieldAlert size={14} /> Check!
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center border-2 transition-all duration-300 ${
            gameState.turn === 'white' 
              ? 'bg-white border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' 
              : 'bg-neutral-900 border-neutral-600 shadow-none'
          }`}>
            <div className={`w-6 h-6 rounded-full ${gameState.turn === 'white' ? 'bg-neutral-900' : 'bg-transparent'}`} />
          </div>
          <div>
            <p className="font-bold text-xl capitalize tracking-tight">{gameState.turn}</p>
            <p className="text-xs text-neutral-500">Thinking...</p>
          </div>
        </div>
      </div>

      {/* Move History */}
      <div className="bg-neutral-800 flex-1 min-h-[300px] p-4 rounded-xl shadow-lg border border-neutral-700 flex flex-col">
        <h3 className="text-neutral-400 font-semibold uppercase tracking-wider text-xs mb-4 flex items-center gap-2 border-b border-neutral-700 pb-2">
          <History size={14} /> Move History
        </h3>
        <div className="overflow-y-auto max-h-[400px] space-y-1 custom-scrollbar pr-2">
          {gameState.moveHistory.length === 0 ? (
            <p className="text-neutral-600 italic text-sm text-center py-10">No moves yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {gameState.moveHistory.map((move, index) => (
                <div key={index} className="flex gap-2 items-center text-sm">
                  <span className="text-neutral-600 w-4 text-[10px]">{Math.floor(index / 2) + 1}.</span>
                  <span className={`px-2 py-1 rounded w-full ${index % 2 === 0 ? 'bg-neutral-700/50' : 'bg-neutral-700/30'} font-mono`}>
                    {move}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};