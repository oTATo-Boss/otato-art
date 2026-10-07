"""第 2 步：桌面上的现成模型"""
import sys
sys.path.insert(0, "/Users/griffith/Desktop/AI/我的项目/oTATo.Art/3d/workbench")
import importlib, lib
importlib.reload(lib)
from lib import *

clear_coll("Props")
P = coll("Props")
M = ASSETS + "/models/"
DESK_Z = 0.75
info = {}


def put(key, blend, loc, height=None, yaw=0.0, keep=None, scale=None, drop=None):
    root, objs, size = append_asset(blend, P, keep=keep, **({"drop": drop} if drop else {}))
    place(root, loc, height=height, size=size, yaw_deg=yaw, scale=scale)
    info[key] = [round(v, 3) for v in size]
    return root, objs


put("plant", "/Users/griffith/Desktop/模型素材/potted_plant_02_4k.blend/potted_plant_02_4k.blend", (-0.84, -0.16, DESK_Z), height=0.52, yaw=20)
put("pens", M + "M08_stationery_supplies/stationery_supplies_2k.blend", (-0.46, -0.14, DESK_Z), scale=1.0, keep=["pencilcup"])
put("lamp", M + "M03_desk_lamp_arm_01/desk_lamp_arm_01_2k.blend", (1.12, -0.1, DESK_Z), height=0.55, yaw=205)
put("books", M + "M06_binder_notebook/binder_notebook_2k.blend", (0.86, -0.27, DESK_Z), scale=1.6, yaw=-10, keep=["closed"])
put("camera", M + "M05_Camera_01/Camera_01_2k.blend", (0.64, -0.14, DESK_Z), height=0.075, yaw=-20, keep=["Camera_01"], drop=("wdg_",))
put("mug", M + "M07_kitchenthings/kitchenthings.blend", (0.72, -0.5, DESK_Z), height=0.1, yaw=30, keep=["Cup2"])
put("apple", MORE + "/food_apple_01_4k/food_apple_01_4k.blend", (-0.26, -0.2, DESK_Z), height=0.075, yaw=40)
put("frame", M + "M09_standing_picture_frame_01/standing_picture_frame_01_2k.blend", (-0.62, -0.06, DESK_Z), height=0.16, yaw=12)
put("stapler", M + "M09_vintage_stapler/vintage_stapler_2k.blend", (-0.08, -0.08, DESK_Z), height=0.05, yaw=-70)

# 公仔
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=TOY + "/otato-ceramic.glb")
new = [o for o in bpy.data.objects if o not in before]
toy_root = bpy.data.objects.new("toy_root", None)
P.objects.link(toy_root)
for o in new:
    link(o, P)
    if o.parent is None:
        o.parent = toy_root
toy_root.rotation_euler = (0, 0, math.radians(-12))
s = 0.128 / 2.8
toy_root.scale = (s, s, s)
toy_root.location = (0.17, -0.27, DESK_Z)
bpy.context.view_layer.update()
zmin = min((c.matrix_world @ Vector(v)).z for c in toy_root.children_recursive if c.type == "MESH" for v in c.bound_box)
toy_root.location.z += DESK_Z + 0.003 - zmin
for o in P.objects:
    if o.name.startswith(("wdg_", "hlp_")):
        o.hide_render = True
        o.hide_viewport = True

# 笔筒里的笔
pm = {"k": mat("pen_black", "#151515", 0.35), "b": mat("pen_blue", "#2B5FFC", 0.3, coat=0.5), "r": mat("pen_red", "#E11D48", 0.3, coat=0.5), "y": mat("pencil_y", "#FFB81C", 0.45)}
cupx, cupy = -0.46, -0.14
for col, dx, dy, tx, ty in [("k", -0.012, 0.004, 0.12, 0.05), ("b", 0.01, -0.006, -0.1, 0.08), ("r", 0.0, 0.01, 0.03, -0.12), ("y", 0.008, 0.012, -0.05, -0.06)]:
    cyl("pen", 0.0045 if col != "y" else 0.004, 0.16, (cupx + dx, cupy + dy, DESK_Z + 0.1), pm[col], P, verts=6 if col == "y" else 16, rot=(tx, ty, 0))

# 切割垫、木印章、一卷躺着的和纸胶带
box("cutting_mat", (0.72, 0.4, 0.003), (0.16, -0.26, DESK_Z + 0.0015), img_mat("mat", ROOT + "/tex/mat.png", 0.75, alpha=False), P, bevel=0.01)
# 立方体没有 UV：切割垫顶面再贴一张图
plane("cutting_mat_top", 0.72, 0.4, (0.16, -0.26, DESK_Z + 0.0032), img_mat("mat", ROOT + "/tex/mat.png", 0.75, alpha=False), P, rot=(0, 0, 0))
wood = pbr("oak_dark", ASSETS + "/textures/T02_white_oak_veneer", scale=3.0, tint="#B07A45")
sx, sy = 0.38, -0.2
box("stamp_base", (0.06, 0.06, 0.026), (sx, sy, DESK_Z + 0.016), wood, P, bevel=0.005)
box("stamp_rubber", (0.056, 0.056, 0.005), (sx, sy, DESK_Z + 0.0035), mat("rubber", "#2B2B2E", 0.7), P, bevel=0.001)
cyl("stamp_neck", 0.012, 0.045, (sx, sy, DESK_Z + 0.05), wood, P, bevel=0.003)
sp = bpy.data.objects.new("stamp_knob", bpy.data.meshes.new("knob"))
P.objects.link(sp)
bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=0.026); bm.to_mesh(sp.data); bm.free()
sp.location = (sx, sy, DESK_Z + 0.086); sp.scale = (1, 1, 0.85); smooth(sp); assign(sp, mat("knob_red", "#E11D48", 0.3, coat=0.7))
plane("stamp_logo", 0.04, 0.04, (sx, sy - 0.0302, DESK_Z + 0.017), img_mat("logo_dark", ROOT + "/tex/logo_sticker.png", 0.5), P)
cyl("washi_roll", 0.03, 0.018, (-0.12, -0.24, DESK_Z + 0.009), mat("tape_#E11D48", "#E11D48", 0.45), P)
cyl("washi_core", 0.019, 0.019, (-0.12, -0.24, DESK_Z + 0.0095), mat("tape_core", "#E8E0CC", 0.8), P)
result = info
