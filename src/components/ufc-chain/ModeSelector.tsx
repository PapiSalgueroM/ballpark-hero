import { GameMode, WeightClass, WEIGHT_CLASSES } from '@/types/ufcChain';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface ModeSelectorProps {
  onSelectMode: (mode: GameMode, weightClass?: WeightClass) => void;
}

export function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  const [showWeightClasses, setShowWeightClasses] = useState(false);

  if (showWeightClasses) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-bold text-red-400 mb-4">Select Weight Class</h2>
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {WEIGHT_CLASSES.map((wc) => (
            <Button
              key={wc}
              onClick={() => onSelectMode('weight-class', wc)}
              className="bg-gray-800 hover:bg-red-700 text-white border border-red-600"
            >
              {wc}
            </Button>
          ))}
        </div>
        <Button
          onClick={() => setShowWeightClasses(false)}
          variant="ghost"
          className="mt-4 text-gray-400 hover:text-white"
        >
          ← Back
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-red-400 mb-6">Select Game Mode</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
        <Button
          onClick={() => onSelectMode('daily')}
          className="bg-red-600 hover:bg-red-700 text-white h-auto py-4 flex flex-col"
        >
          <span className="text-lg font-bold">🗓️ Daily</span>
          <span className="text-xs mt-1">Same fighter for everyone</span>
        </Button>
        
        <Button
          onClick={() => onSelectMode('unlimited')}
          className="bg-gray-800 hover:bg-gray-700 text-white border border-red-600 h-auto py-4 flex flex-col"
        >
          <span className="text-lg font-bold">🔄 Unlimited</span>
          <span className="text-xs mt-1">Random fighter each game</span>
        </Button>
        
        <Button
          onClick={() => setShowWeightClasses(true)}
          className="bg-gray-800 hover:bg-gray-700 text-white border border-red-600 h-auto py-4 flex flex-col"
        >
          <span className="text-lg font-bold">⚖️ Weight Class</span>
          <span className="text-xs mt-1">Stay within one division</span>
        </Button>
        
        <Button
          onClick={() => onSelectMode('hall-of-fame')}
          className="bg-gray-800 hover:bg-gray-700 text-white border border-red-600 h-auto py-4 flex flex-col"
        >
          <span className="text-lg font-bold">🏆 Hall of Fame</span>
          <span className="text-xs mt-1">Legends only</span>
        </Button>
      </div>
    </div>
  );
}