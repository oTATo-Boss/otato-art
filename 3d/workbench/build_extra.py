"""第 5 步：用户自己下载的素材（模型素材文件夹）"""
import sys
import bpy, os
sys.path.insert(0, os.path.dirname(bpy.data.filepath))  # 脚本和 workbench.blend 在同一个文件夹
import importlib, lib
importlib.reload(lib)
from lib import *
from mathutils import Vector, Matrix

S = EXTRA + "/"
TX = ROOT + "/tex/"
clear_coll("Extra")
E = coll("Extra")
DESK_Z = 0.75
# 洞洞板上的木置物架（build_brand 里建的），可爱公仔都摆在这上面
SHELF_TOP, SHELF_Y = 1.02, -0.097
info = {}


def blend(key, rel, loc, height=None, scale=None, yaw=0.0, keep=None, tilt=None):
    root, objs, size = append_asset(S + rel, E, keep=keep)
    place(root, loc, height=height, size=size, yaw_deg=yaw, scale=scale)
    if tilt:
        root.rotation_euler.x = math.radians(tilt[0])
        root.rotation_euler.y = math.radians(tilt[1])
    info[key] = [round(v, 3) for v in size]
    return root


# 桌面
blend("notepads", "office_notepads_4k.blend/office_notepads_4k.blend", (0.74, -0.3, DESK_Z), scale=0.7, yaw=-6)
blend("pencils", "stationery_supplies_4k.blend/stationery_supplies_4k.blend", (-0.06, -0.3, DESK_Z + 0.004), scale=1.0, yaw=12, keep=["pen_", "pencil_", "eraser"], tilt=(-90, 0))
blend("duck", "rubber_duck_toy_4k.blend/rubber_duck_toy_4k.blend", (0.605, SHELF_Y + 0.008, SHELF_TOP), height=0.08, yaw=-25)
blend("watch", "digital_wrist_watch_4k.blend/digital_wrist_watch_4k.blend", (0.56, -0.33, DESK_Z), scale=1.0, yaw=70)
r, sz = import_glb(S + "cute_little_robot.glb", E, 0.125, (0.15, SHELF_Y, SHELF_TOP), yaw=200)  # 模型正面朝 +Y，转 180° 面向镜头
info["robot"] = [round(v, 3) for v in sz]
# 香蕉猫
r, sz = import_glb(S + "cute_cat_in_cute_banana.glb", E, 0.12, (0.475, SHELF_Y, SHELF_TOP), yaw=-28, outlier=100, skip=("Icosphere",))
info["cat"] = [round(v, 3) for v in sz]
# 新来的小机器人（Sketchfab：逍遥开发小组，CC-BY-4.0）
rb, sz = import_glb(ROOT + "/models/robot_bot.glb", E, 0.115, (0.315, SHELF_Y + 0.004, SHELF_TOP), yaw=-104, outlier=6)  # 模型正面朝 +X，转 -90° 面向镜头
info["bot"] = [round(v, 3) for v in sz]
BOT_ROOT = rb


def pose_bot(root, up_deg=58, down_deg=72):
    """小机器人原本是 T 字平举双手。手臂是左右连在一起的整根网格：
    在身体中线切开，右手（画面右）举起来打招呼，左手放下来贴着身体。"""
    bpy.context.view_layer.update()
    meshes = [o for o in root.children_recursive if o.type == "MESH" and not o.hide_render]

    def wbb(o):
        pts = [o.matrix_world @ Vector(v) for v in o.bound_box]
        return Vector([min(q[i] for q in pts) for i in range(3)]), Vector([max(q[i] for q in pts) for i in range(3)])

    a = Vector((math.cos(math.radians(-14)), math.sin(math.radians(-14)), 0))  # 手臂方向（跟着 yaw 稍微转了一点）
    arms = []
    for o in meshes:
        mn, mx = wbb(o)
        if (mx - mn).dot(Vector((abs(a.x), abs(a.y), 0))) > 0.1 and (mx.z - mn.z) < 0.04:
            arms.append(o)
    if not arms:
        return 0
    allp = [wbb(o) for o in arms]
    c = sum(((mn + mx) / 2 for mn, mx in allp), Vector()) / len(allp)
    k = a.cross(Vector((0, 0, 1))).normalized()
    made = 0
    for o in arms:
        me = o.data.copy()
        bm = bmesh.new()
        bm.from_mesh(me)
        bm.transform(o.matrix_world)
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=c, plane_no=a)
        for side, ang in ((1, up_deg), (-1, down_deg)):
            b2 = bm.copy()
            kill = [v for v in b2.verts if (v.co - c).dot(a) * side < -1e-6]
            bmesh.ops.delete(b2, geom=kill, context="VERTS")
            pivot = c + a * side * 0.03
            R = Matrix.Translation(pivot) @ Matrix.Rotation(math.radians(ang), 4, k) @ Matrix.Translation(-pivot)
            b2.transform(R)
            m2 = bpy.data.meshes.new(o.data.name + ("_R" if side > 0 else "_L"))
            b2.to_mesh(m2)
            b2.free()
            for mat in o.data.materials:
                m2.materials.append(mat)
            n = bpy.data.objects.new(o.name + ("_R" if side > 0 else "_L"), m2)
            E.objects.link(n)
            n.parent = root
            n.matrix_parent_inverse = root.matrix_world.inverted()
            smooth(n)
            made += 1
        bm.free()
        o.hide_render = True
        o.hide_viewport = True
    return made


info["bot_arms"] = pose_bot(rb)


def detoon(root):
    """卡通模型：描边外壳(背面剔除)在 Cycles 里会变成一坨实心，藏掉；自发光换成正常材质"""
    for o in root.children_recursive:
        if o.type != 'MESH':
            continue
        ms = [sl.material for sl in o.material_slots if sl.material]
        if ms and all(m.use_backface_culling for m in ms):
            o.hide_render = True
            o.hide_viewport = True
            continue
        for m in ms:
            if m.get("detooned"):
                continue
            nt = m.node_tree
            em = next((n for n in nt.nodes if n.type == 'EMISSION'), None)
            out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
            if not em or not out:
                continue
            b = nt.nodes.new("ShaderNodeBsdfPrincipled")
            b.inputs["Roughness"].default_value = 0.45
            src = em.inputs["Color"]
            if src.is_linked:
                nt.links.new(src.links[0].from_socket, b.inputs["Base Color"])
            else:
                b.inputs["Base Color"].default_value = src.default_value
            nt.links.new(b.outputs[0], out.inputs["Surface"])
            m["detooned"] = 1


detoon(r)
# 置物架右端：一小盆绿植
blend("shelf_plant", "../codex/models/M02_potted_plant_04/potted_plant_04_2k.blend", (0.755, SHELF_Y + 0.004, SHELF_TOP), height=0.15, yaw=30)

# ── 右下角：乱糟糟的书堆 + 笔记本 ──
CM = ASSETS + "/models/"
BOOKS = CM + "M06_decorative_book_set_01/decorative_book_set_01_2k.blend"


def world_bb(objs):
    pts = [o.matrix_world @ Vector(v) for o in objs for v in o.bound_box]
    return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])


def lay_book(name, cx, cy, z, yaw, flip=False):
    """书模型原本是竖着放的（厚度沿 X、高度沿 Z、底边在原点）；放倒、转个角度，底面落在 z"""
    with bpy.data.libraries.load(BOOKS, link=False) as (src, dst):
        dst.objects = [name]
    o = dst.objects[0]
    link(o, E)
    o.location = (0, 0, 0)
    o.rotation_euler = (0, math.radians(-90 if flip else 90), math.radians(yaw))
    bpy.context.view_layer.update()
    mn, mx = world_bb([o])
    o.location = (cx - (mn.x + mx.x) / 2, cy - (mn.y + mx.y) / 2, z - mn.z)
    bpy.context.view_layer.update()
    return world_bb([o])[1].z


def grouped(build, loc, yaw):
    """在原点建一组物体，再整体挪到 loc、转 yaw"""
    before = set(E.objects)
    build()
    g = bpy.data.objects.new("grp", None)
    E.objects.link(g)
    for o in E.objects:
        if o not in before and o is not g and o.parent is None:
            o.parent = g
    g.location = loc
    g.rotation_euler = (0, 0, math.radians(yaw))
    bpy.context.view_layer.update()
    return g


paper = mat("nb_paper", "#F3EEE2", 0.85)


def spiral_notebook(w=0.15, d=0.21, cover="#C9A57C", label=True):
    t = 0.011
    box("nb_back", (w, d, 0.0016), (0, 0, 0.0008), mat("nb_cov_" + cover, cover, 0.7), E, bevel=0.0006)
    box("nb_pages", (w - 0.008, d - 0.006, t - 0.003), (0.002, 0, 0.0016 + (t - 0.003) / 2), paper, E, bevel=0.0008)
    box("nb_front", (w, d, 0.0016), (0, 0, t - 0.0008), mat("nb_cov_" + cover, cover, 0.7), E, bevel=0.0006)
    n = 15
    for i in range(n):
        yy = -d / 2 + 0.012 + i * (d - 0.024) / (n - 1)
        torus("nb_ring", 0.0062, 0.0008, (-w / 2 + 0.003, yy, t / 2), bpy.data.materials.get("chrome"), E, rot=(math.pi / 2, 0, 0))
    if label:
        plane("nb_label", 0.05, 0.05, (0.025, 0.04, t + 0.0003), img_mat("logo_sticker", TX + "logo_sticker.png", 0.5, coat=0.4), E, rot=(0, 0, math.radians(-8)))


def moleskine(w=0.13, d=0.21, cover="#1C1C1E", band="#151515"):
    t = 0.016
    cm = mat("mk_cov_" + cover, cover, 0.62)
    box("mk_back", (w, d, 0.002), (0, 0, 0.001), cm, E, bevel=0.0012)
    box("mk_pages", (w - 0.004, d - 0.006, t - 0.004), (-0.001, 0, 0.002 + (t - 0.004) / 2), mat("mk_paper", "#EFE6D2", 0.85), E, bevel=0.001)
    box("mk_front", (w, d, 0.002), (0, 0, t - 0.001), cm, E, bevel=0.0012)
    box("mk_spine", (0.003, d, t), (-w / 2 + 0.0015, 0, t / 2), cm, E, bevel=0.0012)
    box("mk_band", (0.004, d + 0.002, t + 0.0015), (w / 2 - 0.018, 0, t / 2), mat("mk_band", band, 0.5), E, bevel=0.0008)
    box("mk_ribbon", (0.005, 0.045, 0.0006), (0.01, -d / 2 - 0.018, 0.0005), mat("ribbon_red", "#C8102E", 0.55), E, rot=(0, 0, math.radians(12)))


DZ = DESK_Z
# 左前（原来闹钟的位置）：书 + 笔记本乱叠成一堆
PX, PY = -0.47, -0.31
lay_book("magazine_01_cover50", PX + 0.09, PY - 0.04, DZ, -26, flip=True)       # 垫底斜着露出来的杂志
z = DZ + 0.006
for name, dx, dy, yaw in [
    ("catalogue_hardcover_01_cover44", 0.0, 0.0, 7),
    ("book_hardcover_01_cover62", -0.012, 0.008, -10),
    ("book_softcover_01_cover52", 0.01, -0.006, 16),
]:
    z = lay_book(name, PX + dx, PY + dy, z, yaw, flip=True)
grouped(lambda: moleskine(), (PX - 0.008, PY + 0.004, z), -22)
z += 0.0165
grouped(lambda: spiral_notebook(), (PX + 0.022, PY - 0.012, z), 14)
PILE_TOP = z + 0.011
result = info
