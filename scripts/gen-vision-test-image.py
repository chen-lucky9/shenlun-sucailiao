# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw, ImageFont

img = Image.new('RGB', (900, 320), 'white')
d = ImageDraw.Draw(img)
font = None
for fp in [r'C:\Windows\Fonts\msyh.ttc', r'C:\Windows\Fonts\simhei.ttf']:
    try:
        font = ImageFont.truetype(fp, 42)
        break
    except Exception:
        continue
if font is None:
    font = ImageFont.load_default()

d.text((40, 50), '1+1=？', font=font, fill='black')
d.text((40, 150), 'A. 1    B. 2    C. 3    D. 4', font=font, fill='black')

out = r'E:\文档\deepseek-harness\default-workspace\shenlun-sucailiao\data\vision-test.png'
img.save(out)
print('saved', out)
