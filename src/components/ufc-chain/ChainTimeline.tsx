import { ChainLink } from '@/types/ufcChain';
import { ChevronRight } from 'lucide-react';

interface ChainTimelineProps {
  chain: ChainLink[];
  gameStatus: 'playing' | 'ended';
}

export function ChainTimeline({ chain, gameStatus }: ChainTimelineProps) {
  if (chain.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <div className="flex flex-wrap items-center justify-center gap-2 p-4 bg-gray-900 rounded-xl border border-red-600">
        {chain.map((link, index) => (
          <div key={index} className="flex items-center">
            <div className="text-center">
              <div className={`px-3 py-2 rounded-lg ${
                gameStatus === 'ended' && index === chain.length - 1 
                  ? 'bg-red-600' 
                  : 'bg-red-700'
              }`}>
                <div className="font-bold text-white text-sm">{link.fighter.name}</div>
                <div className="text-red-200 text-xs">
                  {link.fighter.weightClass} · {link.fighter.record}
                </div>
              </div>
            </div>
            
            {link.defeatedBy && (
              <>
                <ChevronRight className="mx-2 w-5 h-5 text-red-400 flex-shrink-0" />
                <div className="text-red-300 text-sm font-medium px-2">defeated by</div>
                <ChevronRight className="mx-2 w-5 h-5 text-red-400 flex-shrink-0" />
              </>
            )}
          </div>
        ))}
      </div>
      
      <div className="text-center mt-4">
        <div className="text-red-400 font-bold text-lg">
          Chain Length: {chain.length - 1}
        </div>
      </div>
    </div>
  );
}