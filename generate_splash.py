import urllib.request
import os
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image, ImageDraw, ImageFont

img = Image.new('RGB', (1024, 1024), color=(255, 255, 255))
d = ImageDraw.Draw(img)

font_url = "https://github.com/google/fonts/raw/main/ofl/newsreader/static/Newsreader_36pt-BoldItalic.ttf"
font_path = "newsreader.ttf"
if not os.path.exists(font_path):
    urllib.request.urlretrieve(font_url, font_path)

try:
    font = ImageFont.truetype(font_path, 160)
except Exception as e:
    print(f"Failed to load font {font_path}: {e}")
    font = ImageFont.load_default()

text = "FamilyStyle"
bbox = d.textbbox((0, 0), text, font=font)
w = bbox[2] - bbox[0]
h = bbox[3] - bbox[1]

# Primary color from app (dark brown)
d.text(((1024-w)/2, (1024-h)/2), text, fill=(92, 32, 24), font=font)

img.save("assets/clean-splash.png")
print("Image saved to assets/clean-splash.png")
