"""网页素材：一张背景（不含挂件和公仔）+ 每个挂件一张透明精灵图 + 位置 JSON。
用法: python3 render_web.py outdir samples width
"""
import json, os, sys
OUTDIR, SAMPLES, WIDTH = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
sys.argv = ["scene2.py", "/tmp/x.png", str(SAMPLES), str(WIDTH), "build"]
exec(open("/home/claude/otato-3d/scene2.py").read())
from bpy_extras.object_utils import world_to_camera_view
os.makedirs(OUTDIR, exist_ok=True)
scene = bpy.context.scene
cam = scene.camera
r = scene.render
H = r.resolution_y
all_sprite = [o for g in GROUPS.values() for o in g]
only = sys.argv[5] if len(sys.argv) > 5 else None

def proj(p):
    v = world_to_camera_view(scene, cam, Vector(p))
    return v.x, 1 - v.y

meta = {"width": WIDTH, "height": H, "sprites": {}}
# 1) 背景
if os.environ.get("SKIP_PLATE") != "1":
    for o in all_sprite:
        o.hide_render = True
    r.film_transparent = False
    r.use_border = False
    r.image_settings.file_format = "WEBP"
    r.image_settings.quality = 90
    r.filepath = os.path.join(OUTDIR, "plate.webp")
    bpy.ops.render.render(write_still=True)
    for o in all_sprite:
        o.hide_render = False
# 2) 精灵：只让这一组对相机可见，其余物体照常参与光照和反射
others = [o for o in bpy.data.objects if o.type in ("MESH", "FONT", "CURVE") and o not in all_sprite]
for o in others:
    o.visible_camera = False
r.film_transparent = True
r.use_border = True
r.use_crop_to_border = True
r.image_settings.file_format = "PNG"
r.image_settings.color_mode = "RGBA"
bpy.context.view_layer.update()
ONLY = os.environ.get("SPRITES", "").split(",") if os.environ.get("SPRITES") else None
for gid, objs in GROUPS.items():
    if ONLY and gid not in ONLY:
        continue
    for g2, o2 in GROUPS.items():
        for o in o2:
            o.hide_render = g2 != gid
    xs, ys = [], []
    for o in objs:
        for c in o.bound_box:
            x, y = proj(o.matrix_world @ Vector(c))
            xs.append(x); ys.append(y)
    pad = 0.012
    x0, x1 = max(0, min(xs) - pad), min(1, max(xs) + pad)
    y0, y1 = max(0, min(ys) - pad), min(1, max(ys) + pad)
    r.border_min_x, r.border_max_x = x0, x1
    r.border_min_y, r.border_max_y = 1 - y1, 1 - y0
    r.filepath = os.path.join(OUTDIR, f"{gid}.png")
    bpy.ops.render.render(write_still=True)
    px, py = proj(PIVOTS[gid])
    meta["sprites"][gid] = {"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0, "px": px, "py": py}
    print("sprite", gid, meta["sprites"][gid])
old = os.path.join(OUTDIR, "layout.json")
if ONLY and os.path.exists(os.environ.get("BASE_LAYOUT", "")):
    base = json.load(open(os.environ["BASE_LAYOUT"]))
    base["sprites"].update(meta["sprites"])
    meta = base
json.dump(meta, open(old, "w"), indent=1)
print("ALL DONE")
