"""给 Blender 出的网页素材统一调色：去灰（拉白点 + 轻 S 曲线）、加一点饱和和暖。
plate 和透明小图用同一套参数，保证拼在一起颜色一致。
用法：python3 grade.py 输入.png 输出.png
"""
import sys
import numpy as np
from PIL import Image

BLACK, WHITE = 0.02, 0.95   # AgX 出图最亮只到 0.9 左右，拉到接近纯白
CURVE = 0.3                 # S 曲线强度
SAT = 1.15
WARM = (1.018, 1.0, 0.975)


def grade_rgb(c):
    c = np.clip((c - BLACK) / (WHITE - BLACK), 0, 1)
    s = c * c * (3 - 2 * c)
    c = c + (s - c) * CURVE
    l = (c * np.array([0.2126, 0.7152, 0.0722])).sum(-1, keepdims=True)
    c = l + (c - l) * SAT
    c = c * np.array(WARM)
    return np.clip(c, 0, 1)


if __name__ == "__main__":
    im = Image.open(sys.argv[1])
    a = np.asarray(im.convert("RGBA")).astype(np.float64) / 255
    a[..., :3] = grade_rgb(a[..., :3])
    out = Image.fromarray((a * 255 + 0.5).astype(np.uint8), "RGBA")
    if im.mode == "RGB":
        out = out.convert("RGB")
    out.save(sys.argv[2])
