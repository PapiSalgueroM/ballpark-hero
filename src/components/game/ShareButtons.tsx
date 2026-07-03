import { useState, useRef } from 'react';
import { Copy, Mail, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { ALL_GAMES } from '@/data/gameRegistry';
import ShareCard from '@/components/game/ShareCard';

interface ShareButtonsProps {
  score: string;
  gameName: string;
  gamePath: string;
  /** Override the entire share text (e.g. for World Cup predictor) */
  customText?: string;
  /** Optional pre-built emoji grid for the score card */
  emojiGrid?: string;
}

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const MessagesIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
  </svg>
);

const ShareButtons = ({ score, gameName, gamePath, customText, emojiGrid }: ShareButtonsProps) => {
  const [igTooltip, setIgTooltip] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Default share text (used by X, WhatsApp, Instagram-copy, Gmail, Messages).
  // Always ends with the site URL + game path, and includes the emoji grid
  // when the caller supplied one. `customText` is a full override, authored
  // by the calling page, so it is trusted as-is and not re-wrapped here; every
  // existing customText call site already ends with its own douknowball.com URL.
  const shareText = customText || [
    `I scored ${score} on ${gameName} at DoUKnowBall! Can you beat me?`,
    ...(emojiGrid ? [emojiGrid] : []),
    `douknowball.com${gamePath}`,
  ].join('\n');

  const gameEmoji = ALL_GAMES.find(g => g.path === gamePath)?.emoji || '🏆';

  const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Copy Score Card text: same shape as the image card (ShareCard.tsx) so
  // both outputs agree. Always ends with douknowball.com + the game path.
  const scoreCard = [
    `${gameEmoji} ${gameName}: ${todayStr}`,
    ...(emojiGrid ? [emojiGrid] : []),
    `Score: ${score}`,
    `douknowball.com${gamePath}`,
  ].join('\n');

  const handleCopyCard = async () => {
    try {
      await navigator.clipboard.writeText(scoreCard);
      toast.success('Score card copied!');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const handleX = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
  };

  const handleInstagram = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setIgTooltip(true);
      setTimeout(() => setIgTooltip(false), 3000);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const handleSaveImage = async () => {
    if (!cardRef.current || savingImage) return;
    setSavingImage(true);
    try {
      const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
      const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('no blob');

      const fileName = `douknowball-${gamePath.replace(/\//g, '') || 'result'}.png`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Image card saved!');
    } catch {
      toast.error('Could not generate image');
    } finally {
      setSavingImage(false);
    }
  };

  const handleGmail = () => {
    window.open(`https://mail.google.com/mail/?view=cm&body=${encodeURIComponent(shareText)}&su=${encodeURIComponent(`My ${gameName} Score on DoUKnowBall`)}`, '_blank', 'noopener,noreferrer');
  };

  const handleMessages = async () => {
    const smsUrl = `sms:?body=${encodeURIComponent(shareText)}`;
    const link = document.createElement('a');
    link.href = smsUrl;
    link.click();
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      // silent - SMS may have worked
    }
  };

  const btnBase = "inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full transition-all shadow-md hover:scale-110 hover:shadow-lg";

  return (
    <div className="flex flex-col items-center gap-3 mt-5">
      {/* Off-screen card used only for html2canvas image capture */}
      <div aria-hidden="true" style={{ position: 'fixed', left: -99999, top: 0, pointerEvents: 'none', opacity: 0 }}>
        <ShareCard
          ref={cardRef}
          gameName={gameName}
          gameEmoji={gameEmoji}
          dateStr={todayStr}
          score={score}
          emojiGrid={emojiGrid}
          gamePath={gamePath}
        />
      </div>

      {/* Primary actions: copy text card + save image card */}
      <div className="flex flex-row flex-wrap items-center justify-center gap-2">
        <button
          onClick={handleCopyCard}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm font-semibold hover:bg-accent hover:border-primary/30 transition-all shadow-sm"
        >
          <Copy className="w-4 h-4" />
          📋 Copy Score Card
        </button>
        <button
          onClick={handleSaveImage}
          disabled={savingImage}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm font-semibold hover:bg-accent hover:border-primary/30 transition-all shadow-sm disabled:opacity-60"
        >
          <ImageIcon className="w-4 h-4" />
          {savingImage ? 'Saving…' : '🖼️ Save Image'}
        </button>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Share your result</p>
      <div className="flex flex-row flex-wrap items-center justify-center gap-3 relative">
        {/* X / Twitter */}
        <button
          onClick={handleX}
          className={`${btnBase} bg-black text-white`}
          aria-label="Share on X"
        >
          <XIcon className="w-4.5 h-4.5" />
        </button>

        {/* WhatsApp */}
        <button
          onClick={handleWhatsApp}
          className={`${btnBase} text-white`}
          style={{ backgroundColor: '#25D366' }}
          aria-label="Share on WhatsApp"
        >
          <WhatsAppIcon className="w-5 h-5" />
        </button>

        {/* Instagram */}
        <div className="relative">
          <button
            onClick={handleInstagram}
            className={`${btnBase} text-white`}
            style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}
            aria-label="Share on Instagram"
          >
            <InstagramIcon className="w-5 h-5" />
          </button>
          {igTooltip && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/90 text-white text-[10px] px-3 py-1.5 rounded-lg shadow-lg z-50 animate-fade-in">
              Link copied, paste into your Instagram bio or story
            </div>
          )}
        </div>

        {/* Gmail */}
        <button
          onClick={handleGmail}
          className={`${btnBase} text-white`}
          style={{ backgroundColor: '#EA4335' }}
          aria-label="Share via Gmail"
        >
          <Mail className="w-5 h-5" />
        </button>

        {/* iMessage / Messages */}
        <button
          onClick={handleMessages}
          className={`${btnBase} text-white`}
          style={{ backgroundColor: '#34C759' }}
          aria-label="Share via Messages"
        >
          <MessagesIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ShareButtons;
