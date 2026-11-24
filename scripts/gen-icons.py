# 生成 PWA 图标（192 / 512 / maskable 512），输出到 dist/icons
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), '..', 'dist', 'icons')
os.makedirs(OUT, exist_ok=True)

FONT_CANDIDATES = [
    r'C:\Windows\Fonts\msyh.ttc',
    r'C:\Windows\Fonts\msyhbd.ttc',
    r'C:\Windows\Fonts\simhei.ttf',
    r'C:\Windows\Fonts\simsun.ttc',
]

def load_font(size):
    for fp in FONT_CANDIDATES:
        try:
            return ImageFont.truetype(fp, size)
        except Exception:
            continue
    return None

def make(size, maskable=False):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    red = (168, 50, 45, 255)
    if maskable:
        d.rectangle([0, 0, size, size], fill=red)
        scale = 0.50
    else:
        pad = int(size * 0.05)
        radius = int(size * 0.22)
        d.rounded_rectangle([pad, pad, size - pad, size - pad], radius=radius, fill=red)
        scale = 0.56
    f = load_font(int(size * scale))
    if f:
        text = '申'
        bbox = d.textbbox((0, 0), text, font=f)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        x = (size - w) / 2 - bbox[0]
        y = (size - h) / 2 - bbox[1]
        d.text((x, y), text, font=f, fill=(255, 250, 240, 255))
    return img

make(192).save(os.path.join(OUT, 'icon-192.png'))
make(512).save(os.path.join(OUT, 'icon-512.png'))
make(512, maskable=True).save(os.path.join(OUT, 'icon-maskable-512.png'))
print('icons generated: dist/icons/icon-192.png, icon-512.png, icon-maskable-512.png')
