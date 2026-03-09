import { NascarChainLink, getNascarChainMultiplier } from '@/types/nascarChain';
import { ChevronRight } from 'lucide-react';

interface Props {
  chain: NascarChainLink[];
  gameStatus: 'playing' | 'ended';
}

export function NascarChainTimeline({ chain, gameStatus }: Props) {
  if (chain.length === 0) return null;

  const chainLength = chain.length - 1;
  const multiplier = getNascarChainMultiplier(chainLength);

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <div className="flex flex-wrap items-center justify-center gap-2 p-4 bg-neutral-900 rounded-xl border border-red-600">
        {chain.map((link, index) => (
          <div key={index} className="flex items-center">
            <div className="text-center">
              <div className={`px-3 py-2 rounded-lg ${
                gameStatus === 'ended' && index === chain.length - 1
                  ? 'bg-red-700'
                  : 'bg-neutral-800 border border-red-500/30'
              }`}>
                <div className="font-bold text-white text-sm">{link.driverName}</div>
              </div>
            </div>

            {link.connection && (
              <>
                <ChevronRight className="mx-1 w-4 h-4 text-red-400 flex-shrink-0" />
                <div className="text-red-300 text-xs font-medium px-1 max-w-[140px] text-center leading-tight">
                  {link.connection}
                </div>
                <ChevronRight className="mx-1 w-4 h-4 text-red-400 flex-shrink-0" />
              </>
            )}
          </div>
        ))}
      </div>

      <div className="text-center mt-4 space-y-1">
        <div className="text-red-400 font-bold text-lg">Chain Length: {chainLength}</div>
        {multiplier > 1 && (
          <div className="text-red-300 text-sm">🔥 x{multiplier} Multiplier Active!</div>
        )}
      </div>
    </div>
  );
}
