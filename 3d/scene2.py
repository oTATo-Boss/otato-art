"""开场屏静帧 v2：浅色洞洞板 + 每个产品一种不同物件 + 品牌小物。
用法: python3 scene2.py out.png samples width
"""
import math, sys, bpy, bmesh
from mathutils import Vector, Matrix

OUT = sys.argv[1] if len(sys.argv) > 1 else "/home/claude/otato-3d/v2.png"
SAMPLES = int(sys.argv[2]) if len(sys.argv) > 2 else 64
WIDTH = int(sys.argv[3]) if len(sys.argv) > 3 else 1600
MODE = sys.argv[4] if len(sys.argv) > 4 else "still"
T = "/home/claude/otato-3d/tex/"
FB = "/home/claude/otato-site/node_modules/geist/dist/fonts/geist-sans/Geist-Black.ttf"

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


# ───────────────────────── 工具函数 ─────────────────────────
def lin(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple([x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1.0])


def mat(name, color, rough=0.5, metal=0.0, coat=0.0, trans=0.0, ior=1.45, sss=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = lin(color)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Transmission Weight"].default_value = trans
    b.inputs["IOR"].default_value = ior
    if sss:
        b.inputs["Subsurface Weight"].default_value = sss
    return m


def img_mat(name, path, rough=0.5, alpha=True, coat=0.0, emit=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(path)
    tex.interpolation = "Cubic"
    nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    if alpha:
        nt.links.new(tex.outputs["Alpha"], b.inputs["Alpha"])
    b.inputs["Roughness"].default_value = rough
    b.inputs["Coat Weight"].default_value = coat
    return m


def assign(o, m):
    o.data.materials.clear()
    o.data.materials.append(m)
    return o


def smooth(o):
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def box(name, size, loc, m, bevel=0.0, segs=4, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        md = o.modifiers.new("bevel", "BEVEL")
        md.width = bevel
        md.segments = segs
        md.limit_method = "NONE"
        md.harden_normals = False
    smooth(o)
    return assign(o, m)


def cyl(name, r, depth, loc, m, rot=(0, 0, 0), verts=64, bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.object
    o.name = name
    if bevel:
        md = o.modifiers.new("bevel", "BEVEL")
        md.width = bevel
        md.segments = 4
        md.limit_method = "ANGLE"
    smooth(o)
    return assign(o, m)


def sphere(name, r, loc, m, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=64, ring_count=32)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    smooth(o)
    return assign(o, m)


def torus(name, R, r, loc, m, rot=(math.pi / 2, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot, major_segments=48, minor_segments=14)
    o = bpy.context.object
    o.name = name
    smooth(o)
    return assign(o, m)


def plane(name, w, h, loc, m, rot=(math.pi / 2, 0, 0)):
    """竖直面向相机（-y）的平面，宽 w 高 h"""
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = (w, h, 1)
    bpy.ops.object.transform_apply(scale=True)
    return assign(o, m)


def text(name, body, loc, size, m, rot=(math.pi / 2, 0, 0), extrude=0.001):
    bpy.ops.object.text_add(location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.data.body = body
    o.data.font = bpy.data.fonts.load(FB, check_existing=True)
    o.data.size = size
    o.data.extrude = extrude
    o.data.align_x = "CENTER"
    o.data.align_y = "CENTER"
    return assign(o, m)


def group_transform(objs, pivot, rz=0.0, rx=0.0):
    bpy.context.view_layer.update()
    p = Vector(pivot)
    M_ = Matrix.Translation(p) @ Matrix.Rotation(rz, 4, "Z") @ Matrix.Rotation(rx, 4, "X") @ Matrix.Translation(-p)
    for o in objs:
        o.matrix_world = M_ @ o.matrix_world


def collect(fn):
    before = set(bpy.data.objects)
    fn()
    return [o for o in bpy.data.objects if o not in before]


# ───────────────────────── 材质 ─────────────────────────
M = {
    "wall": mat("wall", "#E7E3DC", 0.9),
    "desk": mat("desk", "#F1EEE8", 0.32, coat=0.25),
    "alu": mat("alu", "#CFCFD2", 0.28, metal=1.0),
    "chrome": mat("chrome", "#ECECEE", 0.1, metal=1.0),
    "clear": mat("clear", "#FFFFFF", 0.02, trans=1.0, ior=1.49),
    "frost": mat("frost", "#FFFFFF", 0.3, trans=1.0, ior=1.49),
    "acryl_blue": mat("acryl_blue", "#2B5FFC", 0.03, trans=0.92, ior=1.49, coat=1.0),
    "rose": mat("rose", "#E11D48", 0.28, coat=0.8),
    "yellow": mat("yellow", "#FFB81C", 0.3, coat=0.6),
    "blue_plastic": mat("blue_plastic", "#2747C9", 0.3, coat=0.5),
    "toy": mat("toy", "#FAF9F6", 0.24, coat=0.7, sss=0.05),
    "ink": mat("ink", "#141414", 0.45),
    "white": mat("white", "#FFFFFF", 0.5),
    "paper": mat("paper", "#FBFAF6", 0.85),
    "wood": mat("wood", "#B88A5A", 0.55),
    "wood_dark": mat("wood_dark", "#8A5E37", 0.45, coat=0.3),
    "rubber": mat("rubber", "#2B2B2E", 0.7),
    "string": mat("string", "#D9D2C3", 0.9),
    "tape_b": mat("tape_b", "#2B5FFC", 0.45),
    "tape_r": mat("tape_r", "#F05A78", 0.45),
    "tape_w": mat("tape_w", "#F4F1E9", 0.6),
    "tape_y": mat("tape_y", "#FFC52E", 0.45),
}
# 洞洞板：平铺的圆孔贴图 + 凹凸
pb = bpy.data.materials.new("pegboard")
pb.use_nodes = True
nt = pb.node_tree
bsdf = nt.nodes["Principled BSDF"]
tc = nt.nodes.new("ShaderNodeTexCoord")
mp = nt.nodes.new("ShaderNodeMapping")
mp.inputs["Scale"].default_value = (2.9 / 0.05, 1.3 / 0.05, 1)
ti = nt.nodes.new("ShaderNodeTexImage")
ti.image = bpy.data.images.load(T + "hole.png")
tb = nt.nodes.new("ShaderNodeTexImage")
tb.image = bpy.data.images.load(T + "hole_bump.png")
tb.image.colorspace_settings.name = "Non-Color"
bump = nt.nodes.new("ShaderNodeBump")
bump.inputs["Strength"].default_value = 0.6
nt.links.new(tc.outputs["UV"], mp.inputs["Vector"])
nt.links.new(mp.outputs["Vector"], ti.inputs["Vector"])
nt.links.new(mp.outputs["Vector"], tb.inputs["Vector"])
nt.links.new(ti.outputs["Color"], bsdf.inputs["Base Color"])
nt.links.new(tb.outputs["Color"], bump.inputs["Height"])
nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
bsdf.inputs["Roughness"].default_value = 0.5
M["pegboard"] = pb

# ───────────────────────── 墙、洞洞板、桌面 ─────────────────────────
box("wall", (9, 0.05, 5), (0, 0.47, 2.0), M["wall"])
BOARD_Y = 0.40  # 板子正面
plane("pegboard", 2.9, 1.3, (0.05, BOARD_Y, 1.5), M["pegboard"])
box("board_body", (2.9, 0.018, 1.3), (0.05, BOARD_Y + 0.0095, 1.5), mat("board_edge", "#F4F2ED", 0.5), bevel=0.004)
for x in (-1.36, 1.46):
    for z in (0.94, 2.1):
        cyl("standoff", 0.014, 0.02, (x, BOARD_Y - 0.004, z), M["chrome"], rot=(math.pi / 2, 0, 0), bevel=0.003)

DESK_Z = 0.78
blue_peg = bpy.data.materials.new("blue_peg")
blue_peg.use_nodes = True
_n = blue_peg.node_tree
_b = _n.nodes["Principled BSDF"]
_t = _n.nodes.new("ShaderNodeTexImage"); _t.image = bpy.data.images.load(T + "hole_blue.png")
_c = _n.nodes.new("ShaderNodeTexCoord"); _m = _n.nodes.new("ShaderNodeMapping")
_m.inputs["Scale"].default_value = (0.3 / 0.05, 1.6 / 0.05, 1)
_n.links.new(_c.outputs["UV"], _m.inputs["Vector"]); _n.links.new(_m.outputs["Vector"], _t.inputs["Vector"])
_n.links.new(_t.outputs["Color"], _b.inputs["Base Color"])
_b.inputs["Roughness"].default_value = 0.35
plane("blue_strip", 0.3, 1.6, (1.36, BOARD_Y - 0.012, 1.52), blue_peg)
box("blue_strip_body", (0.3, 0.012, 1.6), (1.36, BOARD_Y - 0.005, 1.52), M["blue_plastic"], bevel=0.003)
box("desk", (5.0, 1.5, 0.05), (0, -0.33, DESK_Z - 0.025), M["desk"], bevel=0.01)


def rail(z, x0, x1):
    y = BOARD_Y - 0.03
    box("rail", (x1 - x0, 0.016, 0.026), ((x0 + x1) / 2, y, z), M["alu"], bevel=0.003)
    for x in (x0 + 0.03, x1 - 0.03):
        cyl("rail_mount", 0.016, 0.03, (x, y + 0.015, z), M["alu"], rot=(math.pi / 2, 0, 0), bevel=0.003)
        cyl("rail_knob", 0.014, 0.012, (x, y - 0.012, z), M["chrome"], rot=(math.pi / 2, 0, 0), bevel=0.004)
    return y


def s_hook(x, z, y):
    """挂在横杆上的小 S 钩，返回下端挂点"""
    torus("hook_a", 0.016, 0.0028, (x, y - 0.002, z + 0.004), M["chrome"], rot=(0, math.pi / 2, 0))
    cyl("hook_b", 0.0028, 0.05, (x, y - 0.018, z - 0.03), M["chrome"])
    torus("hook_c", 0.012, 0.0028, (x, y - 0.018, z - 0.058), M["chrome"], rot=(0, math.pi / 2, 0))
    return Vector((x, y - 0.018, z - 0.07))


# ───────────────────────── 上层挂杆：每个产品一种不同的物件 ─────────────────────────
RAIL1 = 1.8
ry = rail(RAIL1, -0.64, 1.12)
HANG_Y = ry - 0.02


def split_ring(p, R=0.026):
    torus("ring", R, 0.0035, (p.x, p.y, p.z - R), M["chrome"])
    return Vector((p.x, p.y, p.z - 2 * R))


# 01 prompt：蓝色透明亚克力吊牌
def prompt_tag(x):
    p = s_hook(x, RAIL1, ry)
    p = split_ring(p)
    torus("jump", 0.009, 0.003, (p.x, p.y, p.z - 0.006), M["chrome"], rot=(0, math.pi / 2, 0))
    W, H, D = 0.18, 0.30, 0.014
    cz = p.z - 0.012 - H / 2
    box("prompt_tag", (W, D, H), (x, p.y, cz), M["acryl_blue"], bevel=0.03, segs=10)
    plane("prompt_print", W * 0.98, H * 0.98, (x, p.y - D / 2 - 0.0006, cz), img_mat("prompt_print", T + "prompt.png", 0.4))
    cyl("prompt_hole", 0.008, D * 1.1, (x, p.y, p.z - 0.022), M["clear"], rot=(math.pi / 2, 0, 0))


# 02 model：拍立得夹在透明卡套里，红色长尾夹
def model_polaroid(x):
    p = s_hook(x, RAIL1, ry)
    torus("clip_wire", 0.016, 0.0022, (x, p.y, p.z - 0.01), M["chrome"])
    W, H = 0.15, 0.232
    top = p.z - 0.03
    # 长尾夹
    box("clip", (0.062, 0.016, 0.03), (x, p.y, top - 0.008), M["rose"], bevel=0.004)
    cz = top - H / 2
    box("sleeve", (W + 0.012, 0.005, H + 0.016), (x, p.y, cz + 0.002), M["frost"], bevel=0.004)
    box("polaroid", (W, 0.0018, H), (x, p.y, cz), M["paper"], bevel=0.0006)
    plane("polaroid_face", W, H, (x, p.y - 0.0012, cz), img_mat("polaroid", T + "polaroid.png", 0.35, alpha=False, coat=0.5))


# 品牌挂件：镀铬 T^T 小公仔
def chrome_charm(x):
    p = s_hook(x, RAIL1, ry)
    p = split_ring(p, 0.022)
    R = 0.06
    c = Vector((x, p.y, p.z - 0.008 - R))
    sphere("charm_head", R, c, M["chrome"], scale=(1, 0.9, 0.95))
    for s in (-1, 1):
        sphere("charm_ear", R * 0.4, (c.x + s * R * 0.98, c.y, c.z), M["chrome"], scale=(0.5, 0.9, 1))
    text("charm_face", "T^T", (c.x, c.y - R * 0.9, c.z), R * 0.62, M["ink"], extrude=0.0008)


# 03 work：帆布三角旗挂在小木杆上
def work_pennant(x):
    p = s_hook(x, RAIL1, ry)
    W, H = 0.29, 0.36
    top = p.z - 0.07
    cyl("dowel", 0.006, W + 0.05, (x, p.y, top), M["wood"], rot=(0, math.pi / 2, 0))
    for s in (-1, 1):
        sphere("dowel_end", 0.009, (x + s * (W / 2 + 0.028), p.y, top), M["wood_dark"])
        # 吊绳
        a = Vector((x + s * W * 0.42, p.y, top))
        b = Vector((x, p.y, p.z))
        mid = (a + b) / 2
        d = (b - a)
        o = cyl("string", 0.0012, d.length, mid, M["string"])
        o.rotation_mode = "QUATERNION"
        o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new()
    vs = [bm.verts.new((-W / 2, 0, 0)), bm.verts.new((W / 2, 0, 0)), bm.verts.new((0, 0, -H))]
    f = bm.faces.new(vs)
    for loop, (u, v) in zip(f.loops, [(0, 1), (1, 1), (0.5, 0)]):
        loop[uv].uv = (u, v)
    bm.normal_update()
    me = bpy.data.meshes.new("pennant")
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new("pennant", me)
    scene.collection.objects.link(o)
    o.location = (x, p.y - 0.004, top - 0.004)
    sub = o.modifiers.new("sub", "SUBSURF")
    sub.levels = 4
    sub.subdivision_type = "SIMPLE"
    wave = o.modifiers.new("wave", "DISPLACE")
    wtex = bpy.data.textures.new("wave", "CLOUDS")
    wtex.noise_scale = 0.6
    wave.texture = wtex
    wave.strength = 0.012
    wave.direction = "Y"
    so = o.modifiers.new("solid", "SOLIDIFY")
    so.thickness = 0.0025
    smooth(o)
    # 正面印刷：法线方向需朝相机，这里三角形法线朝 -y 或 +y 不确定，用双面材质即可
    assign(o, img_mat("pennant", T + "pennant.png", 0.9, alpha=False))


# 空位：透明亚克力卡 + 虚线框 + COMING SOON
def ghost(x):
    p = s_hook(x, RAIL1, ry)
    box("ghost_clip", (0.03, 0.01, 0.022), (x, p.y, p.z - 0.008), M["clear"], bevel=0.003)
    W, H = 0.17, 0.27
    cz = p.z - 0.02 - H / 2
    box("ghost_card", (W, 0.004, H), (x, p.y, cz), M["frost"], bevel=0.008)
    plane("ghost_print", W, H, (x, p.y - 0.0026, cz), img_mat("ghost", T + "ghost.png", 0.5))


GROUPS = {}
PIVOTS = {}
for gid, fn, gx in [("prompt", prompt_tag, -0.44), ("model", model_polaroid, -0.15), ("charm", chrome_charm, 0.09),
                    ("work", work_pennant, 0.37), ("ghost1", ghost, 0.68), ("ghost2", ghost, 0.93)]:
    GROUPS[gid] = collect(lambda: fn(gx))
    PIVOTS[gid] = (gx, ry, RAIL1)

# ───────────────────────── 下层挂杆：收纳盒 ─────────────────────────
RAIL2 = 1.08
ry2 = rail(RAIL2, -0.64, 1.12)


def apply_mods(o):
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    for md in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=md.name)


def open_box(name, x, z, w, d, h, m, y=None, t=0.005, r=0.012):
    """开口朝上、壁厚 t、四角圆润的盒子，底边在 z"""
    y = (ry2 - d / 2 - 0.012) if y is None else y
    outer = box(name, (w, d, h), (x, y, z + h / 2), m, bevel=r, segs=6)
    apply_mods(outer)
    cut = box(name + "_cut", (w - 2 * t, d - 2 * t, h), (x, y, z + t + h / 2), m, bevel=max(0.002, r - t), segs=6)
    apply_mods(cut)
    bo = outer.modifiers.new("cut", "BOOLEAN")
    bo.object = cut
    bo.operation = "DIFFERENCE"
    bo.solver = "EXACT"
    apply_mods(outer)
    bpy.data.objects.remove(cut)
    rim = outer.modifiers.new("rim", "BEVEL")
    rim.width = t * 0.4
    rim.segments = 3
    rim.limit_method = "ANGLE"
    smooth(outer)
    return y, [outer]


# 透明盒 + 贴纸包
by, _ = open_box("acrylic_box", -0.4, RAIL2 - 0.06, 0.4, 0.1, 0.11, M["clear"])
bag = box("sticker_bag", (0.2, 0.004, 0.26), (-0.47, by + 0.008, RAIL2 + 0.1), M["clear"], bevel=0.004)
sp = plane("sticker_print", 0.198, 0.258, (-0.47, by + 0.0055, RAIL2 + 0.1), img_mat("stickers", T + "stickers.png", 0.35, coat=0.6))
group_transform([bag, sp], (-0.47, by, RAIL2 - 0.05), rx=math.radians(-6))
card = box("card", (0.11, 0.002, 0.15), (-0.29, by + 0.012, RAIL2 + 0.04), M["paper"], bevel=0.001)
card.rotation_euler = (math.radians(-4), 0, math.radians(3))

# 黄色收纳盒 + 卡片
yy, _ = open_box("yellow_bin", 0.14, RAIL2 - 0.06, 0.32, 0.1, 0.085, M["yellow"])
plane("bin_print", 0.2, 0.05, (0.14, yy - 0.0515, RAIL2 - 0.018), img_mat("bin", T + "bin.png", 0.4))
for i, (dx, m, rz) in enumerate([(-0.07, M["paper"], -3), (-0.02, M["rose"], 2), (0.05, M["blue_plastic"], -2)]):
    c = box("bin_card", (0.09, 0.006 if i else 0.002, 0.15), (0.14 + dx, yy + 0.015 - i * 0.014, RAIL2 + 0.04), m, bevel=0.002)
    c.rotation_euler = (math.radians(-5), 0, math.radians(rz))

# 胶带托盘
ty, _ = open_box("tape_tray", 0.66, RAIL2 - 0.06, 0.38, 0.1, 0.06, M["clear"])
for i, m in enumerate(["tape_b", "tape_r", "tape_w", "tape_y"]):
    x = 0.53 + i * 0.088
    cyl("tape", 0.04, 0.028, (x, ty, RAIL2 - 0.06 + 0.044), M[m], rot=(0, math.pi / 2, 0))
    cyl("tape_core", 0.025, 0.029, (x, ty, RAIL2 - 0.06 + 0.044), M["paper"], rot=(0, math.pi / 2, 0))
    cyl("tape_hole", 0.02, 0.03, (x, ty, RAIL2 - 0.06 + 0.044), M["rubber"], rot=(0, math.pi / 2, 0))

# 便签 + 图钉
note = plane("note", 0.17, 0.17, (1.0, BOARD_Y - 0.002, 1.45), img_mat("note", T + "note.png", 0.8, alpha=False))
note.rotation_euler = (math.pi / 2, math.radians(4), 0)
sphere("pin", 0.01, (1.0, BOARD_Y - 0.01, 1.52), M["rose"])

# 左上：亚克力立牌
plane("sign_print", 0.26, 0.32, (-0.84, BOARD_Y - 0.026, 1.58), img_mat("sign", T + "sign.png", 0.4))
box("sign", (0.28, 0.008, 0.34), (-0.84, BOARD_Y - 0.03, 1.58), M["clear"], bevel=0.006)
for dx in (-0.12, 0.12):
    for dz in (-0.15, 0.15):
        cyl("sign_screw", 0.008, 0.04, (-0.84 + dx, BOARD_Y - 0.016, 1.58 + dz), M["chrome"], rot=(math.pi / 2, 0, 0), bevel=0.003)

# ───────────────────────── 桌面 ─────────────────────────
mat_ = box("cutting_mat", (1.15, 0.52, 0.003), (0.3, 0.1, DESK_Z + 0.0015), img_mat("mat", T + "mat.png", 0.75, alpha=False), bevel=0.012)
# 立方体 UV 默认每个面都铺满整张图，顶面可用


# logo 公仔：白色圆头 + 两侧耳罩 + 圆头笔画的 T^T（笔画贴着球面）
def capsule(name, a, b, r, m):
    a, b = Vector(a), Vector(b)
    d = b - a
    o = cyl(name, r, d.length, (a + b) / 2, m, verts=24)
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    return [o, sphere(name + "_a", r, a, m), sphere(name + "_b", r, b, m)]


def figure(x, y, s=1.0, yaw=0.0, m=None):
    m = m or M["toy"]
    R = 0.085 * s
    z = DESK_Z + 0.003
    c = Vector((x, y, z + R * 0.94))
    rx, ry_, rz = R, R * 0.96, R * 0.94
    objs = [sphere("toy_head", R, c, m, scale=(1, 0.96, 0.94))]
    for sd in (-1, 1):
        objs.append(sphere("toy_ear", R * 0.42, (x + sd * R * 0.97, y, c.z + R * 0.02), m, scale=(0.5, 1, 1)))
    sr = R * 0.052  # 笔画半径

    def on(u, v):
        """脸上 (u, v)（以 R 为单位）→ 球面上的点，稍微浮出一点"""
        px, pz = u * R, v * R
        k = 1 - (px / rx) ** 2 - (pz / rz) ** 2
        py = -ry_ * math.sqrt(max(0.0, k))
        return (c.x + px, c.y + py - sr * 0.15, c.z + pz)

    strokes = []
    for sd in (-1, 1):
        cx = sd * 0.37
        strokes += [((cx - 0.17, 0.13), (cx + 0.17, 0.13)), ((cx, 0.13), (cx, -0.2))]
    strokes += [((-0.1, 0.02), (0.0, 0.13)), ((0.0, 0.13), (0.1, 0.02))]
    for i, (p0, p1) in enumerate(strokes):
        objs += capsule(f"toy_stroke{i}", on(*p0), on(*p1), sr, M["ink"])
    group_transform(objs, (x, y, z), rz=yaw)


GROUPS["toy"] = collect(lambda: figure(0.5, 0.12, 1.0, math.radians(-14)))
PIVOTS["toy"] = (0.5, 0.12, DESK_Z)

# 木头印章
sx, sy = 0.18, 0.22
box("stamp_base", (0.075, 0.075, 0.03), (sx, sy, DESK_Z + 0.018), M["wood"], bevel=0.006)
box("stamp_rubber", (0.07, 0.07, 0.006), (sx, sy, DESK_Z + 0.004), M["rubber"], bevel=0.0015)
cyl("stamp_neck", 0.014, 0.05, (sx, sy, DESK_Z + 0.058), M["wood_dark"], bevel=0.003)
sphere("stamp_knob", 0.03, (sx, sy, DESK_Z + 0.098), M["wood_dark"], scale=(1, 1, 0.85))
plane("stamp_logo", 0.05, 0.05, (sx, sy - 0.0381, DESK_Z + 0.019), img_mat("stamp_logo", "/home/claude/otato-3d/logo.png", 0.5))

# 书（往里挪，不再被裁掉）
BX, BY = 0.84, 0.18
for i in range(3):
    b = box("book", (0.34, 0.24, 0.024), (BX, BY, DESK_Z + 0.012 + i * 0.025), M["paper"] if i != 1 else M["blue_plastic"], bevel=0.003)
    b.rotation_euler = (0, 0, math.radians(-6 + i * 3))
plane("book_cover", 0.32, 0.23, (BX, BY, DESK_Z + 0.0755), img_mat("book", T + "book.png", 0.6, alpha=False), rot=(0, 0, math.radians(0)))

# 植物：白色陶盆 + 一丛叶子（右后角）
PX, PY = 1.05, 0.3
ceramic = mat("ceramic", "#F6F4EF", 0.35, coat=0.4)
cyl("pot", 0.065, 0.11, (PX, PY, DESK_Z + 0.055), ceramic, bevel=0.008)
cyl("soil", 0.058, 0.004, (PX, PY, DESK_Z + 0.108), mat("soil", "#3B2A1E", 0.95))
leaf_m = mat("leaf", "#3F7F4C", 0.42, coat=0.25, sss=0.08)


def leaf(base, yaw, pitch, L, W):
    bm = bmesh.new()
    nu, nv = 14, 6
    grid = []
    for i in range(nu + 1):
        u = i / nu
        row = []
        for j in range(nv + 1):
            v = j / nv * 2 - 1
            w = math.sin(math.pi * min(1, u * 1.05)) ** 0.8 * W
            along = u * L
            # 叶子向上长再往下垂，中脉微微折起
            co = Vector((v * w, along * math.cos(pitch), along * math.sin(pitch) - 0.9 * along * along + abs(v) * w * 0.25))
            row.append(bm.verts.new(co))
        grid.append(row)
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    me = bpy.data.meshes.new("leaf")
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new("leaf", me)
    scene.collection.objects.link(o)
    o.location = base
    o.rotation_euler = (0, 0, yaw)
    so = o.modifiers.new("s", "SOLIDIFY")
    so.thickness = 0.0015
    smooth(o)
    return assign(o, leaf_m)


for i in range(11):
    a = i * 2.39996
    leaf((PX + math.cos(a) * 0.01, PY + math.sin(a) * 0.01, DESK_Z + 0.105), a, math.radians(50 + (i % 4) * 9), 0.17 + (i % 3) * 0.035, 0.036 + (i % 2) * 0.01)

# 笔筒：白瓷杯 + 几支带笔帽的笔 + 一支黄色铅笔
CX, CY = -0.34, 0.3
cyl("cup", 0.042, 0.11, (CX, CY, DESK_Z + 0.055), ceramic, bevel=0.006)
cyl("cup_in", 0.036, 0.004, (CX, CY, DESK_Z + 0.108), M["rubber"])
for i, (dx, dy, t, body, cap) in enumerate([(-0.012, 0.0, 0.14, "ink", "ink"), (0.013, 0.01, -0.12, "white", "blue_plastic"), (0.0, -0.013, 0.05, "white", "rose")]):
    pen = cyl("pen", 0.0055, 0.17, (CX + dx, CY + dy, DESK_Z + 0.13), M[body], bevel=0.001)
    pen.rotation_euler = (t, t * 0.7, 0)
    capo = cyl("pen_cap", 0.0062, 0.05, (CX + dx, CY + dy, DESK_Z + 0.2), M[cap], bevel=0.0015)
    capo.rotation_euler = (t, t * 0.7, 0)
    bpy.context.view_layer.update()
    # 笔帽跟着笔的方向放在顶端
    capo.location = pen.matrix_world @ Vector((0, 0, 0.07))
pc = cyl("pencil", 0.0045, 0.16, (CX + 0.02, CY - 0.006, DESK_Z + 0.12), mat("pencil", "#FFB81C", 0.4), verts=6)
pc.rotation_euler = (-0.08, 0.2, 0)

# 黄色蘑菇台灯：挪进画面
lx, ly = -0.7, 0.27
cyl("lamp_base", 0.075, 0.018, (lx, ly, DESK_Z + 0.009), M["blue_plastic"], bevel=0.008)
cyl("lamp_stem", 0.012, 0.25, (lx, ly, DESK_Z + 0.14), M["chrome"])
cyl("lamp_collar", 0.02, 0.02, (lx, ly, DESK_Z + 0.255), M["blue_plastic"], bevel=0.004)
dome = sphere("lamp_dome", 0.135, (lx, ly, DESK_Z + 0.265), M["yellow"], scale=(1, 1, 0.72))
bm = bmesh.new()
bm.from_mesh(dome.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.02], context="VERTS")
bm.to_mesh(dome.data)
bm.free()
dome.modifiers.new("sol", "SOLIDIFY").thickness = 0.008
dome.modifiers.new("sub", "SUBSURF").levels = 1
bulb = sphere("bulb", 0.045, (lx, ly, DESK_Z + 0.255), mat("bulb", "#FFF4D8", 0.3))
em = bulb.active_material.node_tree.nodes["Principled BSDF"]
em.inputs["Emission Color"].default_value = lin("#FFE7B0")
em.inputs["Emission Strength"].default_value = 6.0

# ───────────────────────── 灯光 / 相机 ─────────────────────────
world = bpy.data.worlds.new("w")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = lin("#F1EEE9")
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.16


def area(loc, energy, size, color, aim):
    bpy.ops.object.light_add(type="AREA", location=loc)
    l = bpy.context.object
    l.data.energy = energy
    l.data.size = size
    l.data.color = color
    d = Vector(aim) - Vector(loc)
    l.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    return l


area((-2.2, -1.6, 3.0), 260, 0.35, (1.0, 0.93, 0.84), (0.1, 0.4, 1.4))   # 暖色主光（窗）
area((2.6, -2.4, 1.8), 90, 2.5, (0.9, 0.95, 1.0), (0.2, 0.3, 1.2))      # 冷色补光
area((0.2, -1.4, 3.4), 60, 3.0, (1, 1, 1), (0.2, 0.0, 0.8))              # 顶光

# 阳光：从左上前方斜射进来，前面挡几根窗棂，墙上留下斜斜的光影
bpy.ops.object.light_add(type="SUN", location=(0, 0, 4))
sun = bpy.context.object
sun.data.energy = 2.6
sun.data.angle = math.radians(1.5)
sun.data.color = (1.0, 0.9, 0.78)
sd = Vector((0.75, 0.55, -0.62)).normalized()
sun.rotation_euler = (-sd).to_track_quat("Z", "Y").to_euler()
for i in range(5):
    bx = -1.9 + i * 0.42
    b = box("window_bar", (0.07, 0.07, 3.2), (bx, -0.55, 2.3), M["ink"])
    b.rotation_euler = (math.radians(-15), math.radians(28), 0)
    b.visible_camera = False
    b.visible_glossy = False
box("window_sill", (3.5, 0.08, 0.07), (-0.6, -0.55, 3.15), M["ink"]).visible_camera = False

bpy.ops.object.camera_add(location=(0.14, -1.62, 1.48))
cam = bpy.context.object
cam.rotation_euler = (math.radians(84.0), 0, 0)
cam.data.lens = 31
cam.data.dof.use_dof = True
cam.data.dof.focus_distance = 1.98
cam.data.dof.aperture_fstop = 4.0
scene.camera = cam

r = scene.render
r.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 8
scene.cycles.transmission_bounces = 8
r.resolution_x = WIDTH
r.resolution_y = WIDTH * 9 // 16
scene.view_settings.view_transform = "Khronos PBR Neutral"
scene.view_settings.exposure = -0.9
r.filepath = OUT
if MODE == "still":
    bpy.ops.wm.save_as_mainfile(filepath="/home/claude/otato-3d/scene2.blend")
    bpy.ops.render.render(write_still=True)
    print("done", OUT)
