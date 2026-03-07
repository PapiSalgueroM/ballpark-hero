import { Copy, Twitter, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ShareButtonsProps {
  score: string;
  gameName: string;
  gamePath: string;
}

const ShareButtons = ({ score, gameName, gamePath }: ShareButtonsProps) => {
  const shareText = `I scored ${score} on today's ${gameName} on DoUKnowBall! Can you beat me? 🏆 douknowball.com${gamePath}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const handleTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-5">
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary text-secondary-foreground rounded-full text-sm font-semibold hover:bg-secondary/80 transition-all"
      >
        <Copy className="w-4 h-4" />
        Copy Score
      </button>
      <button
        onClick={handleTwitter}
        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
        aria-label="Share on X"
      >
        <Twitter className="w-4 h-4" />
      </button>
      <button
        onClick={handleWhatsApp}
        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
        aria-label="Share on WhatsApp"
      >
        <MessageCircle className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ShareButtons;
