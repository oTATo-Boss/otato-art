"""第 3 步：品牌挂件（细化版）+ 下层收纳"""
import sys
sys.path.insert(0, "/Users/griffith/Desktop/AI/我的项目/oTATo.Art/3d/workbench")
import importlib, lib
importlib.reload(lib)
from lib import *

TX = ROOT + "/tex/"
FONT_M = "/Users/griffith/Desktop/AI/我的项目/oTATo.Art/node_modules/geist/dist/fonts/geist-sans/Geist-Medium.ttf"
for n in ("Charms", "Shelves"):
    clear_coll(n)
CH, SH = coll("Charms"), coll("Shelves")
RAIL1, RAIL2 = 1.65, 1.1
RY = -0.035 - 0.028
K = 1.32
chrome = mat("chrome", "#E9E9EC", 0.08, metal=1.0)
string = mat("string", "#D8CDB8", 0.9)
GROUPS = {}


def s_hook(x, c):
    torus("hook_top", 0.014, 0.0026, (x, RY, RAIL1 + 0.004), chrome, c, rot=(0, math.pi / 2, 0))
    cyl("hook_stem", 0.0026, 0.045, (x, RY - 0.016, RAIL1 - 0.028), chrome, c, verts=12)
    torus("hook_low", 0.011, 0.0026, (x, RY - 0.016, RAIL1 - 0.053), chrome, c, rot=(0, math.pi / 2, 0))
    return Vector((x, RY - 0.016, RAIL1 - 0.064))


def ring(p, R, c, axis="y"):
    rot = (math.pi / 2, 0, 0) if axis == "y" else (0, math.pi / 2, 0)
    torus("ring", R, 0.0028, (p.x, p.y, p.z - R), chrome, c, rot=rot)
    return Vector((p.x, p.y, p.z - 2 * R))


def kraft_tag(p, c, img, dx=0.03, dz=-0.02, tilt=12):
    """挂在环上的牛皮纸编号小吊牌（带一小段棉绳）"""
    W, H = 0.06, 0.03
    cx, cz = p.x + dx, p.z + dz - H / 2
    cyl("tag_string", 0.0008, abs(dz) + 0.012, (p.x + dx * 0.5, p.y - 0.004, p.z + dz * 0.5), string, c, verts=6, rot=(0, math.radians(-tilt * 2), 0))
    t = box("kraft_tag", (W, 0.0012, H), (cx, p.y - 0.006, cz), mat("kraft", "#C9A06B", 0.85), c, bevel=0.0008, rot=(0, math.radians(tilt), 0))
    pl = plane("kraft_print", W * 0.98, H * 0.96, (cx, p.y - 0.0068, cz), img_mat("tag_" + img, TX + img + ".png", 0.8, alpha=False), c, rot=(math.pi / 2, math.radians(tilt), 0))
    return t


def group(gid, fn, x):
    c = coll("charm_" + gid, CH)
    for o in list(c.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    fn(x, c)
    piv = Vector((x, RY, RAIL1))
    bpy.context.view_layer.update()
    for o in c.objects:
        o.matrix_world = Matrix.Translation(piv) @ Matrix.Scale(K, 4) @ Matrix.Translation(-piv) @ o.matrix_world
    GROUPS[gid] = c


# ── prompt：口袋笔记本（封面印刷 + 书页 + 松紧带 + 扣眼）──
cover_m = mat("nb_cover", "#2B5FFC", 0.55, coat=0.15)
pages = pbr("nb_pages", ASSETS + "/textures/T06_Paper006", scale=6.0, tint="#F6F0E2")
band = mat("nb_band", "#141414", 0.55)


def notebook(x, c):
    p = s_hook(x, c)
    p = ring(p, 0.02, c)
    kraft_tag(p + Vector((0, 0, 0.012)), c, "tag1", dx=0.034, dz=-0.026, tilt=14)
    W, H, D = 0.095, 0.145, 0.016
    top = p.z + 0.006
    cz = top - H / 2
    y = p.y
    box("nb_cover_back", (W, 0.0018, H), (x, y + D / 2 - 0.0009, cz), cover_m, c, bevel=0.004)
    box("nb_cover_front", (W, 0.0018, H), (x, y - D / 2 + 0.0009, cz), cover_m, c, bevel=0.004)
    plane("nb_cover_print", W - 0.002, H - 0.002, (x, y - D / 2 - 0.0002, cz), img_mat("cover", TX + "cover.png", 0.5, alpha=False, coat=0.15), c)
    box("nb_pages", (W - 0.006, D - 0.003, H - 0.007), (x + 0.002, y, cz), pages, c, bevel=0.0012)
    box("nb_spine", (0.004, D, H), (x - W / 2 + 0.0014, y, cz), cover_m, c, bevel=0.0018)
    box("nb_band", (0.006, D + 0.004, H + 0.0012), (x + W / 2 - 0.016, y, cz), band, c, bevel=0.0014)
    cyl("nb_grommet", 0.0058, D + 0.0035, (x, y, top - 0.012), chrome, c, rot=(math.pi / 2, 0, 0))
    cyl("nb_grommet_hole", 0.0034, D + 0.004, (x, y, top - 0.012), mat("hole_dark", "#222222", 0.6), c, rot=(math.pi / 2, 0, 0))
    # 书签丝带从底部露出来
    box("nb_ribbon", (0.005, 0.0006, 0.03), (x + 0.02, y + 0.002, cz - H / 2 - 0.012), mat("ribbon", "#E11D48", 0.4), c)


# ── model：拍立得 + 长尾夹 ──
red = mat("clip_red", "#E11D48", 0.3, coat=0.8)


def acrylic_block(name, W, H, T, loc, m, c, r=0.011, edge=0.0016, hole=None):
    """圆角亚克力块：四个角大圆角，正反面边缘一圈细倒角；hole=(dz, 半径) 在顶部打一个穿绳孔"""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        v.co = Vector((v.co.x * W, v.co.y * T, v.co.z * H))
    ey = [e for e in bm.edges if abs((e.verts[0].co - e.verts[1].co).normalized().y) > 0.9]
    bmesh.ops.bevel(bm, geom=ey, offset=r, segments=10, affect="EDGES", profile=0.5)
    rim = [e for e in bm.edges if len(e.link_faces) == 2 and sum(abs(f.normal.y) > 0.9 for f in e.link_faces) == 1]
    bmesh.ops.bevel(bm, geom=rim, offset=edge, segments=3, affect="EDGES", profile=0.5)
    bm.to_mesh(me)
    bm.free()
    o = new_obj(name, me, c)
    o.location = loc
    assign(o, m)
    if hole:
        cut = cyl(name + "_hole", hole[1], T * 3, (loc[0], loc[1], loc[2] + hole[0]), m, c, rot=(math.pi / 2, 0, 0), verts=32)
        bo = o.modifiers.new("hole", "BOOLEAN")
        bo.object = cut
        bo.operation = "DIFFERENCE"
        bo.solver = "EXACT"
        apply_mods(o)
        bpy.data.objects.remove(cut)
    smooth(o)
    if hasattr(o.data, "set_sharp_from_angle"):
        o.data.set_sharp_from_angle(angle=math.radians(35))
    return o


case_acr = mat("case_acrylic", "#FFFFFF", 0.015, trans=1.0, ior=1.49)


def polaroid(x, c):
    """拍立得封在透明亚克力块里，顶上打孔穿环挂着"""
    p = s_hook(x, c)
    R = 0.011
    torus("case_ring", R, 0.0024, (x, p.y, p.z - R), chrome, c, rot=(0, math.pi / 2, 0))
    kraft_tag(Vector((x, p.y, p.z - 0.004)), c, "tag2", dx=-0.034, dz=-0.018, tilt=-12)
    hz = p.z - 2 * R + 0.0005          # 环最低点穿过的孔
    W, H, T = 0.106, 0.152, 0.012
    top = hz + 0.0095
    cz = top - H / 2
    acrylic_block("case", W, H, T, (x, p.y, cz), case_acr, c, hole=(hz - cz, 0.0042))
    # 封在里面的拍立得（88×107 比例），稍微偏下，给顶上的孔留位置
    PW, PH = 0.086, 0.1046
    pz = cz - 0.011
    box("polaroid", (PW, 0.0012, PH), (x, p.y, pz), mat("photo_paper", "#FBFAF6", 0.6, coat=0.1), c, bevel=0.0004)
    plane("polaroid_face", PW, PH, (x, p.y - 0.00065, pz), img_mat("polaroid_face2", TX + "polaroid2.png", 0.42, alpha=False, coat=0.25), c)


# ── work：复古小显示器 ──
beige = mat("crt_beige", "#E9E2D1", 0.36, coat=0.35)
beige2 = mat("crt_beige2", "#DCD3BE", 0.45)
scr = img_mat("crt_screen", TX + "screen.png", 0.06, alpha=False, coat=1.0, emit=1.6)
dark = mat("crt_dark", "#2A2A2C", 0.5)


def monitor(x, c):
    p = s_hook(x, c)
    p = ring(p, 0.016, c, axis="x")
    W, H, D = 0.15, 0.124, 0.11
    top = p.z + 0.004
    cz = top - H / 2
    y = p.y + D / 2 - 0.012
    kraft_tag(Vector((x - W / 2 + 0.01, y - D / 2, top - 0.01)), c, "tag3", dx=-0.02, dz=-0.03, tilt=-8)
    box("crt_body", (W, D, H), (x, y, cz), beige, c, bevel=0.016, segs=8)
    box("crt_back", (W * 0.74, D * 0.55, H * 0.76), (x, y + D * 0.55, cz + 0.004), beige, c, bevel=0.02, segs=8)
    box("crt_bezel", (W * 0.86, 0.006, H * 0.74), (x, y - D / 2 - 0.001, cz + 0.007), beige2, c, bevel=0.012, segs=6)
    box("crt_screen_well", (W * 0.75, 0.004, H * 0.6), (x, y - D / 2 - 0.0035, cz + 0.008), dark, c, bevel=0.01, segs=6)
    plane("crt_screen", W * 0.7, H * 0.55, (x, y - D / 2 - 0.0058, cz + 0.008), scr, c)
    # 屏幕玻璃：一层很薄的清漆反光
    box("crt_glass", (W * 0.7, 0.0015, H * 0.55), (x, y - D / 2 - 0.0068, cz + 0.008), mat("crt_glass", "#FFFFFF", 0.02, trans=1.0, ior=1.45), c, bevel=0.008)
    # 底部一排：通风口、旋钮、指示灯、logo
    for i in range(6):
        box("crt_vent", (0.012, 0.002, 0.0025), (x - W * 0.3 + i * 0.016, y - D / 2 - 0.0012, cz - H * 0.41), dark, c, bevel=0.0008)
    for i, dx in enumerate((0.03, 0.045)):
        cyl("crt_knob", 0.0048, 0.006, (x + dx, y - D / 2 - 0.003, cz - H * 0.41), beige2, c, rot=(math.pi / 2, 0, 0), bevel=0.0012)
    led = mat("crt_led", "#33FF88", 0.3)
    bsdf(led.node_tree).inputs["Emission Color"].default_value = lin("#33FF88")
    bsdf(led.node_tree).inputs["Emission Strength"].default_value = 8
    cyl("crt_led", 0.0022, 0.004, (x + 0.06, y - D / 2 - 0.0022, cz - H * 0.41), led, c, rot=(math.pi / 2, 0, 0))
    text("crt_logo", "oTATo", (x - W * 0.08, y - D / 2 - 0.0022, cz - H * 0.41), 0.008, dark, c, font=FONT_M, extrude=0.0)
    # 顶部提手环
    torus("crt_handle", 0.012, 0.003, (x, y, top + 0.004), beige2, c, rot=(0, math.pi / 2, 0))
    # 侧面散热槽
    for i in range(5):
        box("crt_side_vent", (0.002, 0.04, 0.003), (x + W / 2 + 0.0004, y + 0.01, cz + 0.02 - i * 0.008), dark, c)


frost = mat("frost", "#FFFFFF", 0.22, trans=1.0, ior=1.49)


def ghost(x, c):
    p = s_hook(x, c)
    box("ghost_clip", (0.026, 0.01, 0.018), (x, p.y, p.z - 0.006), frost, c, bevel=0.003)
    W, H = 0.096, 0.134
    cz = p.z - 0.016 - H / 2
    box("ghost_card", (W, 0.004, H), (x, p.y, cz), frost, c, bevel=0.006)
    plane("ghost_print", W, H, (x, p.y - 0.0026, cz), img_mat("ghost_print", TX + "ghost.png", 0.5), c)


group("prompt", notebook, -0.5)
group("model", polaroid, -0.2)
group("work", monitor, 0.13)
group("ghost1", ghost, 0.46)
group("ghost2", ghost, 0.7)

# ── 下层收纳 ──
# 左：透明亚克力盒，直接用螺丝钉在洞洞板上（不再挂横杆）
clear_acr = mat("clear_acrylic", "#FFFFFF", 0.02, trans=1.0, ior=1.49)
chrome = bpy.data.materials.get("chrome") or mat("chrome", "#DADADA", 0.15, metal=1.0)
BFRONT = -0.035                      # 洞洞板正面
BIN_X, BIN_W, BIN_D, BIN_H = -0.42, 0.38, 0.09, 0.1
BIN_Z = 1.035
by = BFRONT - BIN_D / 2 - 0.003
open_box("sticker_bin", (BIN_X, by, BIN_Z), BIN_W, BIN_D, BIN_H, clear_acr, SH)
for sx in (BIN_X - BIN_W / 2 + 0.05, BIN_X + BIN_W / 2 - 0.05):
    # 透过后壁能看到的螺丝 + 垫片
    cyl("bin_washer", 0.009, 0.0015, (sx, BFRONT - 0.0075, BIN_Z + 0.072), chrome, SH, rot=(math.pi / 2, 0, 0), verts=32)
    cyl("bin_screw", 0.0055, 0.003, (sx, BFRONT - 0.0095, BIN_Z + 0.072), chrome, SH, rot=(math.pi / 2, 0, 0), verts=32, bevel=0.0012)
    cyl("bin_spacer", 0.006, 0.004, (sx, BFRONT - 0.002, BIN_Z + 0.072), chrome, SH, rot=(math.pi / 2, 0, 0), verts=32)
# 盒里乱放的贴纸卡（靠后）
for i, (sid, dx, ang, tilt) in enumerate([(2, 0.02, -4, 83), (13, 0.12, 11, 76)]):
    plane("bin_sticker", 0.07, 0.07, (BIN_X + dx, by + 0.022 - i * 0.003, BIN_Z + 0.075), img_mat("sticker_%02d" % sid, TX + "sticker_%02d.png" % sid, 0.35, coat=0.6), SH, rot=(math.radians(tilt), math.radians(ang), 0))
# 贴纸包：透明自封袋装着一整版 oTATo 贴纸，斜靠在盒子后壁
PW, PH, LEAN = 0.15, 0.195, math.radians(7)
px, py0, pz0 = BIN_X - 0.07, by + 0.022, BIN_Z + 0.006
pc = (px, py0 + math.sin(LEAN) * PH / 2, pz0 + math.cos(LEAN) * PH / 2)
bag = acrylic_block("sticker_bag", PW, PH, 0.0024, pc, mat("bag_clear", "#FFFFFF", 0.06, trans=1.0, ior=1.4), SH, r=0.004, edge=0.0006)
bag.rotation_euler = (-LEAN, 0, math.radians(-3))
plane("sticker_pack", PW * 0.97, PH * 0.97, (pc[0], pc[1] - 0.0014 * math.cos(LEAN), pc[2] + 0.0014 * math.sin(LEAN)), img_mat("stickerpack", TX + "stickerpack.png", 0.3, coat=0.7), SH, rot=(math.pi / 2 - LEAN, math.radians(-3), 0))

# 左边：亚克力标语牌，四颗不锈钢螺丝撑起来钉在洞洞板上
SX, SZ, SW, SHH, ST = -0.685, 1.27, 0.19, 0.234, 0.006
sy = BFRONT - 0.014
acrylic_block("sign", SW, SHH, ST, (SX, sy, SZ), clear_acr, SH, r=0.006, edge=0.001)
plane("sign_print", SW * 0.94, SW * 0.94 / 0.8125, (SX, sy - ST / 2 - 0.0003, SZ), img_mat("sign", TX + "sign.png", 0.35, coat=0.5), SH)
for dx in (-1, 1):
    for dz in (-1, 1):
        cx, cz = SX + dx * (SW / 2 - 0.016), SZ + dz * (SHH / 2 - 0.016)
        cyl("sign_post", 0.0055, BFRONT - (sy + ST / 2), (cx, (BFRONT + sy + ST / 2) / 2, cz), chrome, SH, rot=(math.pi / 2, 0, 0), verts=32)
        cyl("sign_cap", 0.0072, 0.007, (cx, sy - ST / 2 - 0.0035, cz), chrome, SH, rot=(math.pi / 2, 0, 0), verts=40, bevel=0.0025)

# 胶带：横七竖八地丢在盒里
tape_core = mat("tape_core", "#E8E0CC", 0.8)
def tape(col, loc, rot):
    cyl("tape", 0.032, 0.022, loc, mat("tape_" + col, col, 0.45, coat=0.2), SH, rot=rot, verts=48, bevel=0.002)
    cyl("tape_core", 0.02, 0.0225, loc, tape_core, SH, rot=rot, verts=48)
tape("#2B5FFC", (BIN_X - 0.12, by - 0.008, BIN_Z + 0.038), (math.radians(90), 0, math.radians(8)))        # 立着，正对镜头
tape("#E11D48", (BIN_X - 0.04, by - 0.012, BIN_Z + 0.017), (0, 0, 0))                                        # 平躺
tape("#FFB81C", (BIN_X - 0.032, by - 0.016, BIN_Z + 0.04), (math.radians(14), math.radians(-9), 0))         # 叠在红的上面，歪着
tape("#F3F0E8", (BIN_X + 0.06, by - 0.006, BIN_Z + 0.036), (math.radians(90), math.radians(28), math.radians(-35)))  # 斜靠
tape("#7CC4A0", (BIN_X + 0.135, by - 0.01, BIN_Z + 0.038), (math.radians(74), 0, math.radians(-14)))     # 靠着右壁

# 中偏右：木置物架（比参考图长），上面摆可爱公仔（公仔在 build_extra 里放）
SHELF_X0, SHELF_X1 = 0.06, 0.82
SHELF_TOP, SHELF_T, SHELF_D = 1.02, 0.03, 0.12
oak = bpy.data.materials.get("oak")
shelf_wood = bpy.data.materials.get("shelf_wood")
if not shelf_wood:
    shelf_wood = oak.copy()
    shelf_wood.name = "shelf_wood"
sb = bsdf(shelf_wood.node_tree)
sb.inputs["Coat Weight"].default_value = 0.35
sb.inputs["Coat Roughness"].default_value = 0.25
sy = BFRONT - SHELF_D / 2 - 0.002
box("shelf", (SHELF_X1 - SHELF_X0, SHELF_D, SHELF_T), ((SHELF_X0 + SHELF_X1) / 2, sy, SHELF_TOP - SHELF_T / 2), shelf_wood, SH, bevel=0.009, segs=6)
bracket = mat("bracket", "#EFECE6", 0.38, coat=0.2)
for bx in (SHELF_X0 + 0.09, SHELF_X1 - 0.09):
    box("bracket_back", (0.014, 0.005, 0.085), (bx, BFRONT - 0.0025, SHELF_TOP - SHELF_T - 0.0425), bracket, SH, bevel=0.0015)
    box("bracket_arm", (0.014, SHELF_D - 0.02, 0.006), (bx, sy + 0.008, SHELF_TOP - SHELF_T - 0.003), bracket, SH, bevel=0.0015)
    box("bracket_brace", (0.01, 0.006, 0.117), (bx, BFRONT - 0.04, SHELF_TOP - SHELF_T - 0.0425), bracket, SH, bevel=0.0015, rot=(math.atan2(0.08, 0.085), 0, 0))
result = {"groups": list(GROUPS)}
