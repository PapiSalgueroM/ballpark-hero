import { NascarChainLink, getNascarChainMultiplier } from '@/types/nascarChain';
import { ChevronRight } from 'lucide-react';
import motion from '@/components/game/ChainLinkMotion.module.css';

interface Props {
  chain: NascarChainLink[];
  gameStatus: 'playing' | 'ended';
}

export function NascarChainTimeline({ chain, gameStatus }: Props) {
  if (chain.length === 0) return null;

  const chainLength = chain.length - 1;
  const multiplier = getNascarChainMultiplier(chainLength);

  return (
    <div data-chain-timeline="nascar" className="w-full max-w-4xl mx-auto mb-8">
      <div className="flex flex-wrap items-center justify-center gap-2 p-4 bg-neutral-900 rounded-xl border border-red-600">
        {chain.map((link, index) => (
          <div key={index} className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-y-1">
            <div className={`min-w-0 max-w-full text-center ${motion.wrap}`}>
              <div data-chain-link={index === chain.length - 1 ? (index > 0 ? 'latest' : 'seed') : 'earlier'} data-chain-link-index={index} className={`px-3 py-2 rounded-lg ${index > 0 && index === chain.length - 1 ? motion.latest : ''} ${
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
                <div data-chain-connection={index === chain.length - 2 ? 'latest' : 'earlier'} className={`min-w-0 text-red-300 text-xs font-medium px-1 max-w-[140px] text-center leading-tight ${motion.wrap} ${index === chain.length - 2 ? motion.connection : ''}`}>
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
