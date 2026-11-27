import { describe, expect, it } from 'vitest';
import { defense, drives, driveStep, fieldGoalYards, kickoff, replayDrive, type Action } from '@/lib/twoMinuteDrive';

describe('Two-Minute Drive', () => {
  const winners: Action[][] = [
    ['draw', 'seam', 'draw', 'seam'],
    ['draw', 'seam', 'kick'],
    ['seam', 'screen'],
    ['seam', 'seam', 'draw'],
  ];
  it.each(drives.map((s, i) => ({ s, winner: winners[i] })))('lets the coach win $s.name and lose the same setup', ({ s, winner }) => {
    const result = replayDrive(s, winner)!;
    expect(result.verdict).toBe('win');
    let deepOnly = kickoff(s);
    while (!deepOnly.verdict) deepOnly = driveStep(s, deepOnly, 'seam')!;
    expect(deepOnly.verdict).toBe('loss');
    expect(replayDrive(s, [...winner, 'draw'])).toBeNull();
  });
  it('uses the next snap and the remaining timeout differently on the same field', () => {
    const s = drives[1], base = replayDrive(s, ['draw', 'seam'])!;
    expect(base.running).toBe(true);
    expect(fieldGoalYards(base)).toBe(50);
    expect(driveStep(s, base, 'kick')?.seconds).toBe(0);
    const stopped = driveStep(s, base, 'timeout')!;
    expect(stopped.timeouts).toBe(0);
    expect(stopped.down).toBe(base.down);
    expect(driveStep(s, stopped, 'timeout')).toBeNull();
    expect(driveStep(s, stopped, 'kick')?.seconds).toBe(5);
    const spiked = driveStep(s, base, 'spike')!;
    expect(spiked.down).toBe(base.down + 1);
    expect(spiked.seconds).toBe(base.seconds - 3);
    expect(spiked.running).toBe(false);
  });
  it('keeps a completed snap alive at zero but ends a drive if the clock runs out before the snap', () => {
    const s = drives[2], d = { ...kickoff(s), spot: 96, line: 100, seconds: 1 };
    expect(driveStep(s, d, 'seam')?.verdict).toBe('win');
    expect(driveStep(s, { ...d, running: true }, 'seam')?.verdict).toBe('loss');
  });
  it('adapts to repeat calls and honors boundary, fourth down and range', () => {
    const s = drives[0], start = kickoff(s);
    const boundary = driveStep(s, start, 'out')!;
    expect(boundary.running).toBe(false);
    expect(driveStep(s, boundary, 'spike')).toBeNull();
    const two = driveStep(s, boundary, 'out')!;
    expect(defense(s, two)).toBe('sideline');
    expect(driveStep(s, two, 'out')?.spot).toBe(two.spot);
    expect(driveStep(s, start, 'kick')).toBeNull();
    expect(driveStep(drives[3], kickoff(drives[3]), 'out')?.recap).toContain('Turnover on downs');
  });
  it('rejects invalid or extra saved calls', () => {
    expect(replayDrive(drives[0], ['timeout'])).toBeNull();
    expect(replayDrive(drives[0], ['go-long'])).toBeNull();
    expect(replayDrive(drives[0], Array(41).fill('draw'))).toBeNull();
  });
});
