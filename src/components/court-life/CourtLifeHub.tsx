import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Heart, Dumbbell, Users, CalendarDays, BookOpen } from 'lucide-react';
import { COURT_ATTRIBUTE_KEYS } from '@/data/courtLifeWorld';
import {
  careerActions, courtCareerPlayer, courtCareerRole, courtSeasonScoreBreakdown, courtSeasonStats,
  courtStandings, currentCareerFixture, currentLifeDecision, type CourtCareerEffect,
} from '@/lib/courtLifeCareer';
import type { useCourtLife } from '@/hooks/useCourtLife';
import { useRevealScroll } from '@/hooks/useRevealScroll';

export const courtButton = 'min-h-[44px] rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50';
export const courtPrimary = `${courtButton} border-teal-400 bg-teal-300 text-slate-950 hover:bg-teal-200`;
type Game = ReturnType<typeof useCourtLife>;

export function CourtEffect({ effect }: { effect: CourtCareerEffect }) {
  const changes = [...(['condition', 'credits', 'trust'] as const).map(key => [key, effect[key]] as const), ...COURT_ATTRIBUTE_KEYS.map(key => [key, effect.attrs[key]] as const)].filter(([, amount]) => amount !== 0);
  return <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs" data-court-effect>
    {changes.length ? changes.map(([label, amount]) => <span key={label} className={amount > 0 ? 'text-teal-700 dark:text-teal-300' : 'text-orange-800 dark:text-orange-200'}>{amount > 0 ? '+' : ''}{amount} {label}</span>) : <span>No stat change</span>}
  </span>;
}

export default function CourtLifeHub({ game }: { game: Game }) {
  const career = game.career!;
  const [panel, setPanel] = useState<'home' | 'training' | 'life' | 'team' | 'season' | 'history'>('home');
  const [chapterNumber, setChapterNumber] = useState<number | null>(null);
  const reveal = useRevealScroll(`${panel}:${career.season}:${career.round}:${career.phase}`);
  const player = courtCareerPlayer(career), role = courtCareerRole(career.resources.trust);
  const crew = career.world.crews.find(row => row.id === career.crewId)!;
  const fixture = currentCareerFixture(career), decision = currentLifeDecision(career);
  const standings = courtStandings(career.world, career.fixtures, career.results);
  const own = standings.find(row => row.crewId === crew.id)!;
  const stats = courtSeasonStats(career), score = courtSeasonScoreBreakdown(career);
  const actions = careerActions(career);
  const ready = career.blocksLeft === 0 && Boolean(career.decision);
  const seasonDone = career.phase === 'seasonComplete';
  const lastWeek = career.weeks.at(-1);
  const chapter = career.chapters.find(row => row.season === chapterNumber) ?? career.chapters.at(-1);
  return <section ref={reveal} className="space-y-3" data-court-hub data-court-panel={panel}>
    <div className="overflow-hidden rounded-2xl border border-slate-600 bg-[#172d3b] p-4 text-[#f1e4be]">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs uppercase tracking-[.16em] text-teal-200">Season {career.season} · {crew.name}</p><h2 className="mt-1 font-display text-2xl font-bold">{player.name}</h2><p className="text-sm text-slate-200">{role.name} · {own.wins} wins, {own.draws} draws, {own.losses} losses</p></div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-current font-display text-2xl font-bold" style={{ color: crew.color }}>CL</div>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-600 pt-3">
        {(['condition', 'credits', 'trust'] as const).map(key => <div key={key}><dt className="text-xs capitalize text-slate-300">{key}</dt><dd className="font-display text-xl font-semibold" data-court-resource={key}>{career.resources[key]}{key === 'credits' ? '' : '/100'}</dd></div>)}
      </dl>
    </div>
    {panel !== 'home' && <button type="button" className={courtButton} onClick={() => setPanel('home')}><ArrowLeft className="mr-2 inline h-4 w-4" />Back to your day</button>}
    {panel === 'home' && <>
      {lastWeek && <p className="rounded-xl border border-border p-3 text-xs" role="status">Last game: {(['credits', 'condition', 'trust'] as const).map(key => { const delta = lastWeek.afterMatch[key] - lastWeek.beforeMatch.resources[key]; return `${delta >= 0 ? '+' : ''}${delta} ${key}`; }).join(' · ')}. Assists, defense, the result and turnovers shape trust.</p>}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{seasonDone ? 'The season is in the books' : `Game ${career.round + 1} of 6`}</p>
        <h3 className="mt-1 font-display text-xl font-bold">{seasonDone ? `${score.total}/100 season score` : `${crew.name} vs ${career.world.crews.find(row => row.id === (fixture?.homeId === crew.id ? fixture.awayId : fixture?.homeId))?.name}`}</h3>
        <p className="my-2 text-sm text-muted-foreground">{seasonDone ? 'Your results, role and choices stay in your career.' : ready ? 'Your preparation is done. Take it to the court.' : `${career.blocksLeft} time blocks left. ${career.decision ? 'Your life choice is settled.' : 'One life choice to make.'}`}</p>
        {seasonDone ? <div className="flex flex-wrap gap-2"><button className={courtPrimary} onClick={() => setPanel('season')}>Season recap</button><button className={courtButton} disabled={game.scorePending} onClick={() => { game.nextSeason(); setPanel('home'); }}>Next season</button></div>
          : <button className={courtPrimary} disabled={!ready} onClick={game.start}>Go to the court <ArrowUpRight className="ml-1 inline h-4 w-4" /></button>}
        {game.scorePending && <p className="mt-2 text-xs">Save this finished season with Retry saving before starting the next one. Your score is waiting for that save.</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {([
          ['training', Dumbbell, 'Your day', seasonDone ? 'Attributes and preparation' : `${career.blocksLeft} time blocks to spend`],
          ['life', Heart, 'Life off court', career.decision ? career.decision.label : decision.title],
          ['team', Users, 'Your crew', `${role.name} · ${career.resources.trust} trust`],
          ['season', CalendarDays, 'The season', `${own.played}/6 games played`],
        ] as const).map(([key, Icon, title, subtitle]) => <button key={key} className="min-h-28 rounded-xl border border-border bg-card p-3 text-left hover:border-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={() => setPanel(key)}><Icon className="mb-3 h-5 w-5 text-teal-700 dark:text-teal-300" /><strong className="block text-sm">{title}</strong><span className="mt-1 block text-xs text-muted-foreground">{subtitle}</span></button>)}
      </div>
      {career.chapters.length > 0 && <button className={`${courtButton} w-full`} onClick={() => setPanel('history')}><BookOpen className="mr-2 inline h-4 w-4" />Career chapters ({career.chapters.length})</button>}
    </>}
    {panel === 'training' && <div className="space-y-3">
      <div><h3 className="font-display text-xl font-bold">Make your time count</h3><p className="text-sm text-muted-foreground">Two blocks before every game. Each action uses one. Recovery is free.</p></div>
      <dl className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3">{COURT_ATTRIBUTE_KEYS.map(key => <div key={key} className="flex justify-between gap-2 text-sm"><dt className="capitalize">{key}</dt><dd className="font-semibold">{player.attrs[key]}/95</dd></div>)}</dl>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{actions.map(({ action, label, effect, reason }) => <button key={label} disabled={Boolean(reason)} className={`${courtButton} space-y-1 text-left`} onClick={() => game.prepare(action)}><span className="block">{label}</span><CourtEffect effect={effect} />{reason && <span className="block text-xs font-normal text-muted-foreground">{reason}</span>}</button>)}</div>
      <p className="text-sm font-semibold" role="status">{career.blocksLeft} time blocks left</p>
      {career.preparation.map((record, index) => <div key={index} className="rounded-xl border border-border p-3 text-sm"><strong>Done: {record.label}</strong><CourtEffect effect={record.effect} /></div>)}
    </div>}
    {panel === 'life' && <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Between the games</p><h3 className="mt-1 font-display text-xl font-bold">{decision.title}</h3><p className="mt-2 text-sm">{decision.situation}</p></div>
      {career.decision ? <div className="rounded-xl border border-teal-500 p-4" role="status"><strong>You chose: {career.decision.label}</strong><CourtEffect effect={career.decision.effect} /><p className="mt-2 text-xs text-muted-foreground">These changes are already part of your career.</p></div> : decision.options.map(option => <button key={option.id} disabled={Boolean(option.reason)} className={`${courtButton} block w-full space-y-2 text-left`} onClick={() => game.decide(option.id)}><span className="block">{option.label}</span><span className="block text-sm font-normal text-muted-foreground">{option.explanation}</span><CourtEffect effect={option.effect} />{option.reason && <span className="block text-xs">{option.reason}</span>}</button>)}
    </div>}
    {panel === 'team' && <div className="space-y-3">
      <h3 className="font-display text-xl font-bold">Earn your place</h3>
      <p className="text-sm">You're the {role.name.toLowerCase()}. Trust raises your priority on inbounds and when you call for a pass. Trusted outlet starts at 40, floor leader at 70.</p>
      <p className="text-sm text-muted-foreground">Assists, steals, blocks and wins earn trust. Turnovers cost it. Your teammates still choose whether a pass is open.</p>
      {crew.players.map(row => <div key={row.id} className="rounded-xl border border-border bg-card p-3"><strong className="text-sm">{row.name}{row.id === player.id ? ' (you)' : ''}</strong><dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">{COURT_ATTRIBUTE_KEYS.map(key => <div key={key}><dt className="inline capitalize text-muted-foreground">{key} </dt><dd className="inline font-semibold">{row.attrs[key]}</dd></div>)}</dl></div>)}
    </div>}
    {panel === 'season' && <div className="space-y-3">
      <h3 className="font-display text-xl font-bold">{seasonDone ? 'Your season recap' : 'The race for first'}</h3>
      <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-left text-xs"><caption className="sr-only">Season {career.season} standings</caption><thead className="bg-muted"><tr>{['Crew', 'P', 'W', 'D', 'L', '+/-'].map(label => <th key={label} className="px-2 py-3">{label}</th>)}</tr></thead><tbody>{standings.map(row => <tr key={row.crewId} className={row.crewId === crew.id ? 'bg-teal-500/10 font-semibold' : ''}><th className="px-2 py-3">{career.world.crews.find(team => team.id === row.crewId)!.name}</th>{[row.played, row.wins, row.draws, row.losses, row.scored - row.conceded].map((value, index) => <td key={index} className="px-2 py-3">{value}</td>)}</tr>)}</tbody></table></div>
      <p className="text-xs text-muted-foreground">Order: two table points per win, one per draw, then scoring difference, points scored and crew ID.</p>
      <div className="grid grid-cols-3 gap-2">{(['points', 'assists', 'rebounds', 'steals', 'blocks', 'turnovers'] as const).map(key => <div key={key} className="rounded-xl border border-border p-3 text-center"><strong className="block font-display text-xl">{stats[key]}</strong><span className="text-xs capitalize text-muted-foreground">{key}</span></div>)}</div>
      {seasonDone && <div className="rounded-xl border border-teal-500 bg-teal-500/5 p-4"><h4 className="font-display text-xl font-bold">Season score: {score.total}/100</h4><dl className="mt-2 grid grid-cols-2 gap-2 text-sm">{([['Results', score.wins, 50], ['Scoring', score.scoring, 20], ['Teamwork', score.teamwork, 20], ['Ball security', score.security, 10]] as const).map(([label, value, cap]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd>{value.toFixed(1)}/{cap}</dd></div>)}</dl><p className="mt-2 text-xs text-muted-foreground">The total is rounded once. Only a completed six-game season earns a site score.</p></div>}
      <div className="space-y-2">{career.fixtures.filter(row => row.homeId === crew.id || row.awayId === crew.id).map(row => { const result = career.results.find(item => item.fixtureId === row.id); return <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm"><span>Game {row.round + 1} · {career.world.crews.find(team => team.id === (row.homeId === crew.id ? row.awayId : row.homeId))!.name}</span><strong className="whitespace-nowrap">{result ? `${row.homeId === crew.id ? result.home : result.away} : ${row.homeId === crew.id ? result.away : result.home}` : 'To play'}</strong></div>; })}</div>
    </div>}
    {panel === 'history' && chapter && <div className="space-y-3"><h3 className="font-display text-xl font-bold">Your career chapters</h3><label className="block text-sm">Choose a season<select className="ml-2 min-h-[44px] rounded-xl border border-border bg-card px-3" value={chapter.season} onChange={event => setChapterNumber(Number(event.target.value))}>{career.chapters.map(row => <option key={row.season} value={row.season}>Season {row.season}</option>)}</select></label><div className="rounded-xl border border-border bg-card p-4"><h4 className="font-display text-lg font-bold">Season {chapter.season} · {chapter.score}/100</h4><p className="text-sm">Finished as {courtCareerRole(chapter.resources.trust).name.toLowerCase()}, with {chapter.resources.trust} trust.</p><p className="mt-1 text-xs text-muted-foreground">Shooting {chapter.attributes.shooting} · Passing {chapter.attributes.passing} · Defense {chapter.attributes.defense}</p></div>{chapter.weeks.map(week => <div key={week.fixtureId} className="rounded-xl border border-border p-3 text-sm"><strong>Game {week.round + 1}: {week.decision.label}</strong><CourtEffect effect={week.decision.effect} /><p className="mt-1 text-xs text-muted-foreground">{week.preparation.map(record => record.label).join(' + ')} · Played as {week.beforeMatch.role.toLowerCase()}</p></div>)}</div>}
  </section>;
}
