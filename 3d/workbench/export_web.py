"""导出网页用的素材：
- plate.png      背景（不含挂件、香蕉猫；公仔和架上玩具只隐身，影子留着）
- <sprite>.png   透明小图：toy / robot / bot / duck（同机位，裁到自己的范围）
- charm_<id>.glb 挂件模型（世界坐标，挂点见 layout）
- cat.glb        香蕉猫（带原地跑的动画）
- layout.json    相机、挂点、小图位置
跑之前先跑一遍五个 build_*.py。
"""
import bpy, json, math, os
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

OUT = os.path.join(os.path.dirname(bpy.data.filepath), "renders", "web") + "/"
os.makedirs(OUT, exist_ok=True)
sc = bpy.context.scene
cam = sc.camera
W, H = 2400, 1350
STEP = globals().get("STEP_ONLY")  # 只跑某一步（调试用）


def roots(prefix):
    return [o for o in bpy.data.objects if o.name.startswith(prefix) and o.parent is None]


def tree(o):
    return [o] + list(o.children_recursive)


def renderable(objs):
    return [o for o in objs if o.type in ("MESH", "CURVE", "FONT") and not o.hide_render]


# ── 各组物体 ──
charm_ids = ["prompt", "model", "work", "ghost1", "ghost2"]
charms = {cid: list(bpy.data.collections["charm_" + cid].all_objects) for cid in charm_ids}
cat = tree(roots("cute_cat_in_cute_banana_root")[0])
sprites = {
    "toy": tree(bpy.data.objects["toy_root"]),
    "robot": tree(roots("cute_little_robot_root")[0]),
    "bot": tree(roots("robot_bot_root")[0]),
}
duck_root = [o for o in bpy.data.collections["Extra"].objects if o.type == "EMPTY" and any("duck" in c.name for c in o.children_recursive)]
sprites["duck"] = tree(duck_root[0])

layout = {"width": W, "height": H}

# ── 相机（three 坐标：x, z, -y） ──
def t3(v):
    return [round(v.x, 5), round(v.z, 5), round(-v.y, 5)]

fwd = cam.matrix_world.to_quaternion() @ Vector((0, 0, -1))
layout["camera"] = {
    "position": t3(cam.location),
    "target": t3(cam.location + fwd * 2.4),
    "lens": cam.data.lens,
    "sensor": cam.data.sensor_width,
}
sun = bpy.data.objects["sun"]
d = sun.matrix_world.to_quaternion() @ Vector((0, 0, -1))
layout["sun"] = {"dir": t3(d), "color": list(sun.data.color), "energy": sun.data.energy}

# 挂件挂点 = 钩子最上面那个圈的顶端
pivots = {}
for cid, objs in charms.items():
    top = [o for o in objs if o.name.startswith("hook_top")][0]
    pts = [top.matrix_world @ Vector(v) for v in top.bound_box]
    p = Vector(((min(q.x for q in pts) + max(q.x for q in pts)) / 2, (min(q.y for q in pts) + max(q.y for q in pts)) / 2, max(q.z for q in pts) - 0.004))
    pivots[cid] = t3(p)
layout["charms"] = pivots
# 钩子下端（挂件本体绕这里扭转，钩子本身不跟着扭）
low = {}
for cid, objs in charms.items():
    h = [o for o in objs if o.name.startswith("hook_low")][0]
    pts = [h.matrix_world @ Vector(v) for v in h.bound_box]
    low[cid] = t3(Vector(((min(q.x for q in pts) + max(q.x for q in pts)) / 2, (min(q.y for q in pts) + max(q.y for q in pts)) / 2, min(q.z for q in pts) + 0.003)))
layout["hookLow"] = low
rail = [o for o in bpy.data.objects if o.name.startswith(("rail", "rail_mount")) and o.type == "MESH"]


# ── 导出 glb ──
def export(objs, path, anim=False):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        if o.name in bpy.context.view_layer.objects and not o.hide_render:
            o.hide_set(False)
            o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", use_selection=True, use_visible=False,
        export_image_format="WEBP", export_image_quality=88, export_yup=True,
        export_apply=not anim, export_animations=anim, export_skins=anim,
        export_animation_mode="ACTIONS", export_materials="EXPORT", export_cameras=False, export_lights=False,
    )

if STEP in (None, "glb"):
    for cid, objs in charms.items():
        export(objs, OUT + "charm_%s.glb" % cid)
    export([o for o in cat if not o.hide_render or o.type in ("EMPTY", "ARMATURE")], OUT + "cat.glb", anim=True)
    export(rail, OUT + "rail.glb")

# ── 渲染 ──
saved = {o.name: (o.hide_render, o.visible_camera, o.visible_shadow) for o in bpy.data.objects}
r = sc.render
r.resolution_x, r.resolution_y, r.resolution_percentage = W, H, 100


def restore():
    for o in bpy.data.objects:
        if o.name in saved:
            o.hide_render, o.visible_camera, o.visible_shadow = saved[o.name]
    r.use_border = False
    r.use_crop_to_border = False
    r.film_transparent = False


if STEP in (None, "plate"):
    for objs in charms.values():
        for o in objs:
            o.hide_render = True
    for o in cat + rail:
        o.hide_render = True
    for objs in sprites.values():
        for o in objs:
            o.visible_camera = False
    sc.cycles.samples = 192
    r.filepath = OUT + "plate.png"
    bpy.ops.render.render(write_still=True)
    restore()

# 小图：只有它自己对相机可见，其它东西照样参与光照和遮挡（影子、反光都对）
sprite_info = {}
for key, objs in sprites.items():
    meshes = renderable(objs)
    pts = [world_to_camera_view(sc, cam, o.matrix_world @ Vector(v)) for o in meshes for v in o.bound_box]
    x0, x1 = min(p.x for p in pts) - 0.008, max(p.x for p in pts) + 0.008
    y0, y1 = min(p.y for p in pts) - 0.008, max(p.y for p in pts) + 0.012
    x0, y0, x1, y1 = max(0, x0), max(0, y0), min(1, x1), min(1, y1)
    # 底部中心（转动/跳的支点）
    wpts = [o.matrix_world @ Vector(v) for o in meshes for v in o.bound_box]
    zmin = min(p.z for p in wpts)
    base = Vector(((min(p.x for p in wpts) + max(p.x for p in wpts)) / 2, (min(p.y for p in wpts) + max(p.y for p in wpts)) / 2, zmin))
    pv = world_to_camera_view(sc, cam, base)
    sprite_info[key] = {"x": x0, "y": 1 - y1, "w": x1 - x0, "h": y1 - y0, "px": pv.x, "py": 1 - pv.y}
    if STEP in (None, "sprites"):
        for o in bpy.data.objects:
            o.visible_camera = False
        for o in objs:
            o.visible_camera = saved.get(o.name, (0, True, 0))[1]
        # 别的玩具也别在这张图里出现
        for k2, o2s in sprites.items():
            if k2 != key:
                for o in o2s:
                    o.visible_camera = False
        for o in charms.values():
            pass
        r.film_transparent = True
        r.use_border = True
        r.use_crop_to_border = True
        r.border_min_x, r.border_max_x, r.border_min_y, r.border_max_y = x0, x1, y0, y1
        sc.cycles.samples = 160
        r.filepath = OUT + key + ".png"
        bpy.ops.render.render(write_still=True)
        restore()
layout["sprites"] = sprite_info

# 香蕉猫站的架子面（three 坐标）
layout["shelf"] = {"top": 1.02, "x0": 0.06, "x1": 0.82, "front": 0.155, "back": 0.035}
layout["board"] = 0.035
json.dump(layout, open(OUT + "layout.json", "w"), indent=1)
sc.cycles.samples = 192
result = {"pivots": pivots, "sprites": sprite_info}
