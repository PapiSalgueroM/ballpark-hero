"""Round 286: the DoUKnowBall mark and wordmark, generated, not drawn by hand.

One source produces every asset: the mark (a ball with a question mark cut
into it), the wordmark (Space Grotesk Bold, the site's own display face,
converted to outlines so no viewer needs the font), the horizontal lockup,
the app icon on its rounded dark square, and the social image.

    python3 scripts/logo/gen_logo.py            writes the SVGs into public/
    node scripts/logo/rasterize.mjs             writes the PNGs and the .ico

Colours are the site's own tokens from src/index.css: background
hsl(225 25% 6%), primary hsl(152 60% 42%), foreground hsl(210 20% 95%).
"""
import os, sys, math
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public')
FONT = os.path.join(HERE, 'SpaceGrotesk-Bold.ttf')

BG = '#0b0d14'       # hsl(225 25% 6%)
GREEN = '#2bab74'    # hsl(152 60% 42%)
GREEN_DEEP = '#1f8558'
INK = '#f0f2f5'      # hsl(210 20% 95%)

font = TTFont(FONT)
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
UPM = font['head'].unitsPerEm
CAP = font['OS/2'].sCapHeight


def glyph_path(ch, x, y, size):
    """SVG path data for one glyph, baseline at y, scaled to size px per em."""
    g = glyphs[cmap[ord(ch)]]
    s = size / UPM
    pen = SVGPathPen(glyphs)
    tp = TransformPen(pen, (s, 0, 0, -s, x, y))
    g.draw(tp)
    return pen.getCommands(), g.width * s


def text_paths(text, x, y, size, tracking=0.0):
    """Every glyph in text as (char, path, advance) with the pen advancing."""
    out = []
    cx = x
    for i, ch in enumerate(text):
        d, adv = glyph_path(ch, cx, y, size)
        out.append((ch, d, cx))
        cx += adv + tracking * size
    return out, cx - x


def glyph_bounds(ch):
    g = glyphs[cmap[ord(ch)]]
    bp = BoundsPen(glyphs)
    g.draw(bp)
    return bp.bounds  # xMin yMin xMax yMax in font units


# ── the mark ──────────────────────────────────────────────────────────────
# A 512 unit square. The ball is a circle; two seams curve across it the way a
# tennis ball or a baseball is stitched, which reads as "a ball" without being
# any one sport's ball. The question mark is the site's name in one glyph.

def mark_svg(with_square, size=512):
    r = 196
    cx = cy = size / 2
    q_size = 372  # em size for the question mark
    d, adv = glyph_path('?', 0, 0, q_size)
    xmin, ymin, xmax, ymax = glyph_bounds('?')
    s = q_size / UPM
    gw = (xmax - xmin) * s
    gh = (ymax - ymin) * s
    # centre the glyph's own bounding box on the ball, nudged up a touch so the
    # dot does not sit on the lower seam
    gx = cx - gw / 2 - xmin * s
    gy = cy + gh / 2 + ymin * s - 6
    parts = []
    parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}" role="img" aria-label="DoUKnowBall">')
    if with_square:
        parts.append(f'<rect width="{size}" height="{size}" rx="{int(size * 0.22)}" fill="{BG}"/>')
    parts.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{GREEN}"/>')
    # seams, clipped to the ball
    parts.append(f'<clipPath id="ball"><circle cx="{cx}" cy="{cy}" r="{r}"/></clipPath>')
    seam = (
        f'<g clip-path="url(#ball)" fill="none" stroke="{GREEN_DEEP}" stroke-width="16" stroke-linecap="round">'
        f'<path d="M {cx - r - 20} {cy - 70} C {cx - 60} {cy - 40} {cx - 60} {cy + 40} {cx - r - 20} {cy + 70}"/>'
        f'<path d="M {cx + r + 20} {cy - 70} C {cx + 60} {cy - 40} {cx + 60} {cy + 40} {cx + r + 20} {cy + 70}"/>'
        f'</g>'
    )
    parts.append(seam)
    parts.append(f'<path transform="translate({gx:.1f} {gy:.1f})" d="{d}" fill="{BG}"/>')
    parts.append('</svg>')
    return '\n'.join(parts)


# ── the wordmark and the lockup ──────────────────────────────────────────

def wordmark_group(x, baseline, size):
    """DoUKnow in ink, Ball in green, as one <g>. Returns (svg, width)."""
    runs, width = text_paths('DoUKnowBall', x, baseline, size, tracking=-0.005)
    out = []
    for ch, d, gx in runs:
        pass
    # colour split: the last four glyphs are "Ball"
    n = len(runs)
    for i, (ch, d, gx) in enumerate(runs):
        fill = GREEN if i >= n - 4 else INK
        out.append(f'<path d="{d}" fill="{fill}"/>')
    return '\n'.join(out), width


def lockup_svg():
    size_em = 120
    mark_h = 150
    pad = 12
    # mark scaled into a box mark_h tall
    scale = mark_h / 512
    text_x = mark_h + 34
    baseline = pad + mark_h * 0.5 + CAP * size_em / UPM / 2
    wm, width = wordmark_group(text_x, baseline, size_em)
    total_w = text_x + width + pad
    total_h = mark_h + pad * 2
    inner = mark_svg(False).split('\n')[1:-1]  # strip the svg wrapper
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_w:.0f} {total_h:.0f}" width="{total_w:.0f}" height="{total_h:.0f}" role="img" aria-label="DoUKnowBall">',
        f'<g transform="translate(0 {pad}) scale({scale:.5f})">',
        *inner,
        '</g>',
        wm,
        '</svg>',
    ]
    return '\n'.join(parts), total_w, total_h


def wordmark_svg():
    size_em = 120
    pad = 8
    baseline = pad + CAP * size_em / UPM
    wm, width = wordmark_group(pad, baseline, size_em)
    h = baseline + 0.25 * size_em
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width + pad * 2:.0f} {h:.0f}" width="{width + pad * 2:.0f}" height="{h:.0f}" role="img" aria-label="DoUKnowBall">\n'
        f'{wm}\n</svg>'
    )


def social_svg():
    W, H = 1200, 630
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="DoUKnowBall, free daily sports trivia">',
        '<defs>',
        f'<radialGradient id="glow" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="#14261e"/><stop offset="1" stop-color="{BG}"/></radialGradient>',
        '</defs>',
        f'<rect width="{W}" height="{H}" fill="url(#glow)"/>',
        # a faint centre circle and halfway line, the only decoration
        f'<g fill="none" stroke="{GREEN}" stroke-opacity="0.10" stroke-width="3">',
        f'<circle cx="{W/2}" cy="170" r="260"/>',
        f'<line x1="0" y1="170" x2="{W}" y2="170"/>',
        '</g>',
    ]
    # the mark, 210px tall, centred near the top
    mark_h = 210
    scale = mark_h / 512
    inner = mark_svg(False).split('\n')[1:-1]
    parts.append(f'<g transform="translate({(W - mark_h) / 2:.1f} 62) scale({scale:.5f})">')
    parts.extend(inner)
    parts.append('</g>')
    # the wordmark, centred under it
    size_em = 104
    wm_runs, wm_w = text_paths('DoUKnowBall', 0, 0, size_em, tracking=-0.005)
    n = len(wm_runs)
    parts.append(f'<g transform="translate({(W - wm_w) / 2:.1f} 388)">')
    for i, (ch, d, gx) in enumerate(wm_runs):
        parts.append(f'<path d="{d}" fill="{GREEN if i >= n - 4 else INK}"/>')
    parts.append('</g>')
    # two lines of tagline and the domain
    for text, y, size, fill, opacity in [
        ('Free daily sports trivia, puzzles and career sims.', 470, 34, INK, 0.92),
        ('Every game plays without an account. No downloads.', 522, 34, GREEN, 1.0),
        ('douknowball.com', 590, 26, INK, 0.5),
    ]:
        runs, w = text_paths(text, 0, 0, size)
        parts.append(f'<g transform="translate({(W - w) / 2:.1f} {y})" fill="{fill}" fill-opacity="{opacity}">')
        parts.extend(f'<path d="{d}"/>' for _, d, _ in runs)
        parts.append('</g>')
    parts.append('</svg>')
    return '\n'.join(parts)


def mark_geometry():
    """What the React header needs to draw the mark inline: the question mark
    outline and where it sits. Written to src/ so the header and the files
    in public/ can never disagree about the shape."""
    size = 512
    r = 196
    cx = cy = size / 2
    q_size = 372
    d, adv = glyph_path('?', 0, 0, q_size)
    xmin, ymin, xmax, ymax = glyph_bounds('?')
    sc = q_size / UPM
    gw = (xmax - xmin) * sc
    gh = (ymax - ymin) * sc
    gx = cx - gw / 2 - xmin * sc
    gy = cy + gh / 2 + ymin * sc - 6
    seams = [
        f'M {cx - r - 20} {cy - 70} C {cx - 60} {cy - 40} {cx - 60} {cy + 40} {cx - r - 20} {cy + 70}',
        f'M {cx + r + 20} {cy - 70} C {cx + 60} {cy - 40} {cx + 60} {cy + 40} {cx + r + 20} {cy + 70}',
    ]
    return (
        '/* GENERATED by scripts/logo/gen_logo.py, do not edit by hand. Round 286. */\n'
        'export const LOGO_VIEWBOX = 512;\n'
        f'export const LOGO_BALL = {{ cx: {cx}, cy: {cy}, r: {r} }};\n'
        f'export const LOGO_SEAMS = {seams!r};\n'
        f'export const LOGO_QUESTION_TRANSFORM = \'translate({gx:.1f} {gy:.1f})\';\n'
        f'export const LOGO_QUESTION_PATH = \'{d}\';\n'
    )


def write(name, svg):
    p = os.path.join(OUT, name)
    with open(p, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(svg + '\n')
    print(f'wrote {name} ({len(svg)} bytes)')


if __name__ == '__main__':
    if len(sys.argv) > 1:
        OUT = sys.argv[1]
    write('logo-mark.svg', mark_svg(False))
    write('favicon.svg', mark_svg(True))
    write('logo.svg', lockup_svg()[0])
    write('logo-wordmark.svg', wordmark_svg())
    # the social image's SVG is a build source, not a shipped file: it is
    # 76KB of outlines that only exist to be rasterised, so it lives here
    social_source = os.path.join(HERE, 'og-image.svg')
    if len(sys.argv) > 1:
        social_source = os.path.join(sys.argv[1], 'og-image.svg')
    with open(social_source, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(social_svg() + '\n')
    print(f'wrote {social_source}')
    geom = os.path.join(ROOT, 'src', 'components', 'layout', 'logoMark.ts')
    if len(sys.argv) > 1:
        geom = os.path.join(sys.argv[1], 'logoMark.ts')
    with open(geom, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(mark_geometry())
    print(f'wrote {geom}')
