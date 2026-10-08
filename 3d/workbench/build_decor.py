"""第 4 步：墙面和洞洞板上的装饰：便利贴、贴纸、小海报、和纸胶带"""
import sys, random
import bpy, os
sys.path.insert(0, os.path.dirname(bpy.data.filepath))  # 脚本和 workbench.blend 在同一个文件夹
import importlib, lib
importlib.reload(lib)
from lib import *

clear_coll("Decor")
D = coll("Decor")
TX = ROOT + "/tex/"
IM = ASSETS + "/images/"
BOARD = -0.0365  # 洞洞板表面前一点
WALL = -0.0012   # 后墙表面前一点
random.seed(7)


def zmap(z):
    """装饰位置按原洞洞板（0.93–1.98）换算到压缩后的洞洞板（0.88–1.80）"""
    return 0.88 + (z - 0.93) * (0.92 / 1.05)


def note(name, img, x, z, size, ang, y=BOARD, curl=0.012):
    """便利贴：上边粘着，下半截微微翘起"""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new()
    n = 8
    g = []
    for i in range(n + 1):
        row = []
        for j in range(n + 1):
            u, v = i / n, j / n
            lift = curl * max(0.0, 0.6 - v) ** 2 / 0.36
            row.append(bm.verts.new(((u - 0.5) * size, -lift, (v - 0.5) * size)))
        g.append(row)
    for i in range(n):
        for j in range(n):
            f = bm.faces.new((g[i][j], g[i + 1][j], g[i + 1][j + 1], g[i][j + 1]))
            for l, (a, b) in zip(f.loops, [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]):
                l[uvl].uv = (a / n, b / n)
    bm.to_mesh(me)
    bm.free()
    o = new_obj(name, me, D)
    o.location = (x, y, zmap(z))
    o.rotation_euler = (0, math.radians(ang), 0)
    o.modifiers.new("solid", "SOLIDIFY").thickness = 0.0004
    smooth(o)
    assign(o, img_mat("note_" + img, TX + img + ".png", 0.75, alpha=False))
    return o


def decal(name, path, w, h, x, z, ang=0.0, y=BOARD, rough=0.4, coat=0.5):
    o = plane(name, w, h, (x, y, zmap(z)), img_mat(os.path.basename(path), path, rough, coat=coat), D, rot=(math.pi / 2, math.radians(ang), 0))
    return o


def tape(x, z, w, ang, col, y):
    m = mat("washi_" + col, col, 0.6)
    bs = bsdf(m.node_tree)
    bs.inputs["Alpha"].default_value = 0.82
    return box("washi", (w, 0.0004, 0.022), (x, y - 0.0004, zmap(z)), m, D, rot=(0, math.radians(ang), 0))


# 便利贴（洞洞板上 4 张，后墙右侧 1 张）
note("note_todo", "note5", 0.055, 1.32, 0.13, 3)  # 原来贴在右墙上会被频道索引挡住，挪到洞洞板中间空白处
note("note_good", "note1", -0.18, 1.0, 0.12, 5)
note("note_flow", "note3", 0.31, 1.36, 0.115, -3)
note("note_cn", "note2", -0.3, 1.36, 0.11, -7)
note("note_simple", "note4", 0.67, 1.35, 0.11, 4)

# 小海报：右边后墙贴一张（G06），左边贴一张（G07），洞洞板左上用夹子夹一张天空照片（G08）
decal("poster_right", IM + "G06_a.png", 0.2, 0.3, 1.05, 1.58, 2, y=WALL, rough=0.8, coat=0.0)
tape(1.0, 1.73, 0.07, 30, "#FFB81C", WALL)
tape(1.12, 1.72, 0.07, -25, "#FFB81C", WALL)
decal("poster_left", IM + "G07_a.png", 0.2, 0.3, -0.94, 1.48, -3, y=WALL, rough=0.8, coat=0.0)
tape(-0.94, 1.63, 0.08, 4, "#2B5FFC", WALL)
decal("photo_small", IM + "G08_a.png", 0.1, 0.14, -0.7, 1.88, 6, rough=0.4, coat=0.4)
box("photo_clip", (0.026, 0.006, 0.014), (-0.705, BOARD - 0.004, zmap(1.952)), mat("clip_black", "#151515", 0.4, coat=0.6), D, bevel=0.002)

# 贴纸：随手贴在洞洞板、后墙和挂件附近
spots = [(-0.74, 1.04, 0.06, BOARD), (-0.22, 1.33, 0.05, BOARD), (0.02, 1.02, 0.055, BOARD), (0.6, 0.98, 0.05, BOARD),
         (0.84, 1.88, 0.06, BOARD), (-0.32, 1.92, 0.05, BOARD), (0.36, 1.92, 0.045, BOARD), (-1.0, 1.15, 0.06, WALL),
         (0.98, 1.92, 0.05, WALL), (-0.05, 1.43, 0.05, BOARD)]
ids = [0, 4, 7, 9, 14, 16, 3, 11, 20, 1]
for (x, z, s, y), sid in zip(spots, ids):
    decal("sticker", TX + "sticker_%02d.png" % sid, s, s, x, z, random.uniform(-18, 18), y=y - 0.0003)
decal("logo_sticker", TX + "logo_sticker.png", 0.07, 0.07, -0.08, 1.24, -8, y=BOARD - 0.0004)
result = {"decor": len(D.objects)}
