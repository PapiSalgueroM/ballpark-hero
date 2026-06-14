import { forwardRef } from 'react';

export interface ShareCardProps {
  gameName: string;
  gameEmoji: string;
  dateStr: string;
  /** Human-readable score/result line, e.g. "a Rarity Score of 12% (8/9)" */
  score: string;
  /** Optional pre-built emoji grid (e.g. 🟩🟨⬛). */
  emojiGrid?: string;
  /** Path portion shown under the brand, e.g. "/football-grid". */
  gamePath: string;
}

// Inline hex (not Tailwind classes) so html2canvas rasterizes the card identically
// regardless of theme CSS variables. Colors mirror the site theme (HSL -> hex).
const COLORS = {
  bg: '#0f1420',
  bgAccent: '#161b24',
  primary: '#2bab6f',
  text: '#f0f2f5',
  muted: '#8b94a3',
  border: '#242b38',
};

/**
 * Off-screen branded result card. Render it hidden and pass the ref to
 * html2canvas to produce a shareable PNG. Used by ShareButtons.
 */
const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ gameName, gameEmoji, dateStr, score, emojiGrid, gamePath }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: 540,
          boxSizing: 'border-box',
          padding: 40,
          background: `linear-gradient(160deg, ${COLORS.bgAccent} 0%, ${COLORS.bg} 100%)`,
          borderRadius: 24,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          color: COLORS.text,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 44, lineHeight: 1 }}>{gameEmoji}</span>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>{gameName}</div>
            <div style={{ fontSize: 14, color: COLORS.muted, marginTop: 2 }}>{dateStr}</div>
          </div>
        </div>

        {emojiGrid ? (
          <pre
            style={{
              margin: '28px 0 0',
              fontSize: 30,
              lineHeight: 1.25,
              fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", monospace',
              whiteSpace: 'pre-wrap',
              textAlign: 'center',
            }}
          >
            {emojiGrid}
          </pre>
        ) : null}

        <div
          style={{
            marginTop: 28,
            padding: '20px 24px',
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
          }}
        >
          <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '1.5px', color: COLORS.muted }}>
            Result
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.primary, marginTop: 6 }}>{score}</div>
        </div>

        <div
          style={{
            marginTop: 28,
            paddingTop: 20,
            borderTop: `1px solid ${COLORS.border}`,
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 800, color: COLORS.text }}>
            DoU<span style={{ color: COLORS.primary }}>Know</span>Ball
          </span>
          <span style={{ fontSize: 15, color: COLORS.muted }}>douknowball.com{gamePath}</span>
        </div>
      </div>
    );
  },
);

ShareCard.displayName = 'ShareCard';

export default ShareCard;
