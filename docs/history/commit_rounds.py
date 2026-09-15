#!/usr/bin/env python3
"""Commit the packaged rounds straight from their zips, in order.

The RUN bats were extracting their zip and then not committing, and because the
console window is not visible from here there was no way to read why. This does
the same job with the failure printed instead of swallowed: for each round it
unpacks the zip, checks every file arrived, stages exactly the files that round
ships and nothing else, and commits with that round's message. Never `git add
-A`, which would sweep in .env and about 642 files of pure line ending noise.

Pushing still has to happen separately, because this VM has no network.
"""
import os, subprocess, sys, zipfile

REPO = os.path.expanduser('~/mnt/ballpark-hero')
ROUNDS = [int(a) for a in sys.argv[1:]] or list(range(123, 131))


def git(*args, check=True):
    r = subprocess.run(['git'] + list(args), cwd=REPO, capture_output=True, text=True)
    if check and r.returncode != 0:
        print(f'    git {" ".join(args[:2])} FAILED rc={r.returncode}')
        print('    stdout:', r.stdout.strip()[:600])
        print('    stderr:', r.stderr.strip()[:600])
    return r


def already_in(n):
    r = git('log', '--oneline', '-80', check=False)
    return f'Round {n}:' in r.stdout


for n in ROUNDS:
    zp = os.path.join(REPO, f'ROUND{n}_FILES.zip')
    print(f'\n===== Round {n} =====')
    if already_in(n):
        print('  already committed, skipping')
        continue
    if not os.path.exists(zp):
        print(f'  STOP: {zp} missing')
        sys.exit(1)
    if n > ROUNDS[0] and not already_in(n - 1):
        print(f'  STOP: Round {n-1} is not in the log, order would break')
        sys.exit(1)

    with zipfile.ZipFile(zp) as z:
        names = z.namelist()
        z.extractall(REPO)
    files = [f for f in names if not f.startswith('_commit_msg')]
    msg = [f for f in names if f.startswith('_commit_msg')][0]
    print(f'  unpacked {len(files)} files')

    missing = [f for f in files if not os.path.exists(os.path.join(REPO, f))]
    if missing:
        print('  STOP: did not arrive:', missing)
        sys.exit(1)

    r = git('add', '--', *files)
    if r.returncode != 0:
        sys.exit(1)

    staged = git('diff', '--cached', '--name-only', check=False).stdout.split()
    extra = [f for f in staged if f not in files]
    if extra:
        print('  STOP: something else got staged:', extra[:10])
        sys.exit(1)
    print(f'  staged {len(staged)} files, nothing extra')
    if not staged:
        print('  nothing to commit, the files are already identical to HEAD')
        continue

    r = git('commit', '-F', msg)
    if r.returncode != 0:
        sys.exit(1)
    print('  committed:', git('log', '--oneline', '-1', check=False).stdout.strip()[:110])

print('\n===== done =====')
print(git('log', '--oneline', '-12', check=False).stdout)
ahead = git('rev-list', '--count', 'origin/main..HEAD', check=False).stdout.strip()
print(f'{ahead} commits waiting to be pushed')
