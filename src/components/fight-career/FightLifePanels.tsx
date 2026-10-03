/**
 * Round 916: the screens of the life between fights. Each one is a small
 * panel behind a tile on the hub, with a Back button, and none of them holds
 * state of its own: they read the save and hand an updated save back.
 */
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FightCareerState } from '@/lib/fightCareer';
import {
  TRAINERS, MANAGERS, describeTrainer, describeManager, describeLifeEffect, answerLifeCard,
  trainerDef, managerDef, lifeSharpness, lifeTakeHome, PROMOTER_PURSE_MUL, rivalInYourClass, lifeCardById,
  type FightLife, type TrainerId, type ManagerId,
} from '@/lib/fightCareerLife';
import {
  nextLifeStep, lifeBuyUpgrade, lifeAnswerInbox, fightBadgeFacts, FIGHT_BADGES, type LifeStep,
} from '@/lib/fightCareerLifeFlow';
import { UPGRADES, upgradeLevel, upgradePrice, canBuyUpgrade, fmtBank, MAX_UPGRADE_LEVEL } from '@/lib/fightCareerMoney';
import { answerFightRivalryChoice, dismissFightRivalryEvent, rivalRankLabel } from '@/lib/fightCareerRivalry';
import { FIGHT_INBOX_CALENDAR, unreadFightInbox, describeInboxChoice } from '@/lib/fightCareerInbox';
import { inboxBeatLine } from '@/lib/careerInbox';

type Live = FightCareerState & { life: FightLife };
export type LifeView = 'main' | 'inbox' | 'rival' | 'bank' | 'corner' | 'badges';

const tile = 'min-h-[44px] rounded-md border p-3 text-left transition hover:bg-muted';
const picked = 'border-primary bg-primary/10';

function Back({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="flex min-h-[40px] items-center text-sm text-muted-foreground">
      <ChevronLeft className="h-4 w-4" />Back
    </button>
  );
}

/* ── setup: who is in the corner ── */
export function CornerPicker({ trainer, manager, onTrainer, onManager }: {
  trainer: TrainerId; manager: ManagerId;
  onTrainer: (id: TrainerId) => void; onManager: (id: ManagerId) => void;
}) {
  return (
    <>
      <div className="rounded-lg border bg-card p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Your trainer</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {TRAINERS.map(t => (
            <button key={t.id} onClick={() => onTrainer(t.id)} className={cn(tile, trainer === t.id && picked)}>
              <span className="block text-sm font-semibold">{t.label}</span>
              <span className="block text-[11px] leading-snug text-muted-foreground">{describeTrainer(t)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Your manager</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {MANAGERS.map(m => (
            <button key={m.id} onClick={() => onManager(m.id)} className={cn(tile, manager === m.id && picked)}>
              <span className="block text-sm font-semibold">{m.label}</span>
              <span className="block text-[11px] leading-snug text-muted-foreground">{describeManager(m)}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/* ── the gap: one thing at a time, read off the save ── */
export function LifeStepCard({ st, step, onChange }: { st: Live; step: LifeStep; onChange: (next: Live) => void }) {
  /* Only cards still open count: one whose gate has closed since the deal
     is never shown and lapses on the next answer (pendingLifeCard). */
  const openCards = st.life.pending.filter(id => {
    const c = lifeCardById(id);
    return !!c && (!c.when || c.when(st));
  }).length;
  const waiting = openCards + (st.life.pendingRivalryChoice ? 1 : 0) + (st.life.pendingRivalryEvent ? 1 : 0);
  const head = (emoji: string, title: string, body: string) => (
    <>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Between fights · {waiting} to deal with</p>
      <p className="mt-1 text-lg font-bold">{emoji} {title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </>
  );
  const option = (key: string, label: string, promise: string, run: () => void) => (
    <button key={key} onClick={run} className="min-h-[52px] w-full rounded-md border bg-background p-3 text-left transition hover:border-primary">
      <span className="block text-sm font-semibold">{label}</span>
      <span className="block text-[11px] leading-snug text-muted-foreground">{promise}</span>
    </button>
  );
  if (step.kind === 'beat') {
    return (
      <div className="rounded-lg border bg-card p-4">
        {head(step.event.emoji, step.event.title, step.event.description)}
        <p className="mt-2 text-xs font-medium text-primary">{step.event.consequence}</p>
        <button onClick={() => { const next = dismissFightRivalryEvent(st); if (next) onChange(next); }}
          className="mt-3 min-h-[44px] w-full rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">
          Noted
        </button>
      </div>
    );
  }
  if (step.kind === 'choice') {
    return (
      <div className="rounded-lg border bg-card p-4">
        {head(step.card.emoji, step.card.title, step.card.description)}
        <div className="mt-3 space-y-2">
          {step.card.choices.map((c, i) => option(`${step.card.id}-${i}`, `${c.emoji} ${c.label}`, c.consequence, () => {
            const res = answerFightRivalryChoice(st, i);
            if (res) onChange(res.state);
          }))}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-lg border bg-card p-4">
      {head(step.card.emoji, step.card.title, step.card.text)}
      <div className="mt-3 space-y-2">
        {step.card.options.map((o, i) => option(`${step.card.id}-${i}`, o.label, describeLifeEffect(o.effect), () => {
          const res = answerLifeCard(st, i);
          if (res) onChange(res.state);
        }))}
      </div>
    </div>
  );
}

/* ── the hub tiles ── */
export function LifeTiles({ st, onOpen }: { st: Live; onOpen: (v: LifeView) => void }) {
  const unread = unreadFightInbox(st.life);
  const badges = FIGHT_BADGES.filter(b => b.test(fightBadgeFacts(st))).length;
  const tiles: { v: LifeView; emoji: string; label: string; sub: string }[] = [
    { v: 'inbox', emoji: '📱', label: 'Inbox', sub: unread ? `${unread} unread` : 'Nothing new' },
    { v: 'rival', emoji: '😤', label: 'Rival', sub: st.life.rival ? st.life.rival.name : 'Nobody yet' },
    { v: 'bank', emoji: '🏦', label: 'Bank and shop', sub: fmtBank(st.life.bank) },
    { v: 'corner', emoji: '🧢', label: 'Corner', sub: `Morale ${st.life.morale} · Fans ${st.life.fanbase}` },
    { v: 'badges', emoji: '🎖️', label: 'Badges', sub: `${badges} of ${FIGHT_BADGES.length}` },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {tiles.map(t => (
        <button key={t.v} onClick={() => onOpen(t.v)} className={cn(tile, 'bg-card', t.v === 'inbox' && unread > 0 && 'border-primary')}>
          <span className="block text-sm font-semibold">{t.emoji} {t.label}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{t.sub}</span>
        </button>
      ))}
    </div>
  );
}

/* ── the panels behind the tiles ── */
function InboxPanel({ st, onChange }: { st: Live; onChange: (next: Live) => void }) {
  const texts = st.life.phoneInbox.slice().reverse();
  return (
    <div className="space-y-2">
      {texts.length === 0 && <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Nobody has written yet. People start after your first fight.</p>}
      {texts.map(m => (
        <div key={m.id} className="rounded-lg border bg-card p-3">
          <p className="text-xs font-semibold">{m.emoji} {m.from}</p>
          <p className="text-[10px] text-muted-foreground">{inboxBeatLine(m, FIGHT_INBOX_CALENDAR)?.replace(`, ${m.year}`, `, fight ${m.year}`) ?? `Fight ${m.year}`}</p>
          <p className="mt-1 text-sm">{m.text}</p>
          {m.answered === undefined ? (
            <div className="mt-2 space-y-1.5">
              {m.choices.map((c, i) => (
                <button key={i} onClick={() => { const next = lifeAnswerInbox(st, m.id, i); if (next) onChange(next); }}
                  className="min-h-[44px] w-full rounded-md border bg-background px-3 py-2 text-left text-sm transition hover:border-primary">
                  <span className="block">{c.label}</span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">{describeInboxChoice(c)}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">You: {m.choices[m.answered]?.reply}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function RivalPanel({ st }: { st: Live }) {
  const r = st.life.rival;
  if (!r) return <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Nobody has got under your skin yet.</p>;
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{r.name}</p>
          <p className="text-xs text-muted-foreground">
            {rivalInYourClass(st) ? 'Same weight class as you' : 'Still in the division you left'} · age {Math.floor(r.age)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-primary">{rivalRankLabel(r)}</p>
          <p className="text-xs tabular-nums text-muted-foreground">{r.wins}-{r.losses} ({r.kos} KO)</p>
        </div>
      </div>
      <p className="mt-3 text-sm">Between you: {r.h2hWins} to you, {r.h2hLosses} to him.</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="w-12 shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">Feud</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-destructive transition-all duration-500" style={{ width: `${st.life.rivalryIntensity}%` }} />
        </div>
        <span className="w-7 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">{st.life.rivalryIntensity}</span>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        He fights on while you do. When he calls you out, taking it puts him in the middle offer as a grudge match.
      </p>
    </div>
  );
}

function BankPanel({ st, onChange }: { st: Live; onChange: (next: Live) => void }) {
  const share = Math.round((trainerDef(st.life.trainer.kind).cut + managerDef(st.life.manager.kind).cut) * 100);
  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">In the bank</p>
        <p className="text-2xl font-bold text-primary">{fmtBank(st.life.bank)}</p>
        <p className="text-[11px] text-muted-foreground">
          Your corner takes {share}% of every purse, so 1.00m in the ring is {lifeTakeHome(st, 1).toFixed(2)}m here. There is nothing to bet it on. Spend it on the camp.
        </p>
      </div>
      {UPGRADES.map(u => {
        const lvl = upgradeLevel(st.life, u.id);
        const price = upgradePrice(st.life, u.id);
        return (
          <div key={u.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{u.emoji} {u.label} <span className="text-xs font-normal text-muted-foreground">level {lvl} of {MAX_UPGRADE_LEVEL}</span></p>
              <p className="text-[11px] leading-snug text-muted-foreground">{u.per}, per level.</p>
            </div>
            <button disabled={!canBuyUpgrade(st.life, u.id)}
              onClick={() => { const next = lifeBuyUpgrade(st, u.id); if (next) onChange(next); }}
              className="min-h-[44px] shrink-0 rounded-md border px-3 text-sm font-semibold disabled:opacity-40">
              {price === null ? 'Maxed' : `${price.toFixed(2)}m`}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function CornerPanel({ st }: { st: Live }) {
  const t = trainerDef(st.life.trainer.kind);
  const m = managerDef(st.life.manager.kind);
  const sharp = lifeSharpness(st);
  const meters: [string, number][] = [['Morale', st.life.morale], ['Fans', st.life.fanbase], ['Karma', st.life.karma]];
  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-card p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Trainer</p>
        <p className="text-sm font-semibold">{st.life.trainer.name} · {t.label}</p>
        <p className="text-[11px] text-muted-foreground">{describeTrainer(t)}</p>
      </div>
      <div className="rounded-lg border bg-card p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Manager</p>
        <p className="text-sm font-semibold">{st.life.manager.name} · {m.label}</p>
        <p className="text-[11px] text-muted-foreground">{describeManager(m)}</p>
        {st.life.promoterFights > 0 && (
          <p className="mt-1 text-[11px] font-medium text-primary">
            Exclusive promoter deal: {st.life.promoterFights} fight{st.life.promoterFights === 1 ? '' : 's'} left at {Math.round((PROMOTER_PURSE_MUL - 1) * 100)}% more, safest offer off the table.
          </p>
        )}
      </div>
      <div className="space-y-1.5 rounded-lg border bg-card p-3">
        {meters.map(([label, value]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${value}%` }} />
            </div>
            <span className="w-7 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">{value}</span>
          </div>
        ))}
        <p className="pt-1 text-[11px] text-muted-foreground">
          Next fight night: {sharp > 0 ? `+${sharp}` : sharp} sharpness (power, speed, stamina and defence, that night only).
          Every 10 morale above or below 50 is a point, and morale settles 2 back toward 50 after every fight. Karma drifts 2 toward 50 as well. Kept at 70 or more it hands back 2 morale and 2 fans every fight, so a good name keeps a good mood going; down at 30 or less it costs 1 morale and 2 fans. Every fan adds half a percent to your purses.
        </p>
      </div>
      {st.life.feed.length > 0 && (
        <div className="rounded-lg border bg-card p-3">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Lately</p>
          <div className="max-h-40 space-y-0.5 overflow-y-auto text-xs text-muted-foreground">
            {st.life.feed.map((line, i) => <p key={i}>{line}</p>)}
          </div>
        </div>
      )}
    </div>
  );
}

function BadgesPanel({ st }: { st: Live }) {
  const facts = fightBadgeFacts(st);
  return (
    <div className="grid grid-cols-2 gap-2">
      {FIGHT_BADGES.map(b => {
        const has = b.test(facts);
        return (
          <div key={b.id} className={cn('rounded-lg border p-3', has ? 'border-amber-500/60 bg-amber-500/10' : 'bg-card opacity-60')}>
            <p className="text-sm font-semibold">{b.emoji} {b.label}</p>
            <p className="text-[11px] leading-snug text-muted-foreground">{b.blurb}</p>
          </div>
        );
      })}
    </div>
  );
}

const VIEW_TITLE: Record<Exclude<LifeView, 'main'>, string> = {
  inbox: 'Inbox', rival: 'Your rival', bank: 'Bank and camp shop', corner: 'Your corner', badges: 'Badges',
};

/** One panel and its Back button. */
export function LifePanel({ st, view, onBack, onChange }: {
  st: Live; view: Exclude<LifeView, 'main'>; onBack: () => void; onChange: (next: Live) => void;
}) {
  return (
    <div className="space-y-3">
      <Back onBack={onBack} />
      <h3 className="text-base font-bold">{VIEW_TITLE[view]}</h3>
      {view === 'inbox' && <InboxPanel st={st} onChange={onChange} />}
      {view === 'rival' && <RivalPanel st={st} />}
      {view === 'bank' && <BankPanel st={st} onChange={onChange} />}
      {view === 'corner' && <CornerPanel st={st} />}
      {view === 'badges' && <BadgesPanel st={st} />}
    </div>
  );
}

export { nextLifeStep };
