"""Round 286: favicon.ico from the rasterised icon. Run after rasterize.mjs.

    python3 scripts/logo/make_ico.py

Three sizes in one container (16, 32, 48), all resampled from the 512px
render so they share one source with every other asset.
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.abspath(os.path.join(HERE, '..', '..', 'public'))

src = Image.open(os.path.join(PUBLIC, 'icon-512.png')).convert('RGBA')
out = os.path.join(PUBLIC, 'favicon.ico')
src.save(out, format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
print(f'wrote favicon.ico ({os.path.getsize(out)} bytes)')
