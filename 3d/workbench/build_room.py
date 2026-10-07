"""第 1 步：房间、窗、洞洞板、挂杆、桌子、灯光、相机（白模 + 基础材质）"""
import sys
sys.path.insert(0, "/Users/griffith/Desktop/AI/我的项目/oTATo.Art/3d/workbench")
import importlib, lib
importlib.reload(lib)
from lib import *

sc = bpy.context.scene
for n in ("Room", "Board", "Desk", "Lights"):
    clear_coll(n)
R, BD, DK, LT = coll("Room"), coll("Board"), coll("Desk"), coll("Lights")
for o in list(sc.collection.objects):
    if o.name != "cam":
        bpy.data.objects.remove(o, do_unlink=True)
# 启动场景自带的立方体、相机、灯
for n in ("Cube", "Camera", "Light"):
    if n in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects[n], do_unlink=True)

T = ASSETS + "/textures/"
plaster = pbr("plaster", T + "T01_white_plaster_02", scale=0.8)
_pb = bsdf(plaster.node_tree)
for _l in list(plaster.node_tree.links):
    if _l.to_socket == _pb.inputs["Base Color"]:
        plaster.node_tree.links.remove(_l)
_pb.inputs["Base Color"].default_value = lin("#F2EDE4")
oak = pbr("oak", T + "T02_white_oak_veneer", scale=0.9, tint="#F2CFA0")
linen = pbr("linen", T + "T03_rough_linen", scale=3.0)
floor = pbr("floor", T + "T08_wood_floor", scale=1.0)
alu = mat("alu", "#C9C9CC", 0.3, metal=1.0)
frame_m = mat("window_frame", "#3A3B3D", 0.45, metal=0.6)

# ── 墙 / 地 ──
WALL_Y = 0.0
box("back_wall", (4.2, 0.1, 3.0), (0.3, WALL_Y + 0.05, 1.5), plaster, R)
LX = -1.15  # 左墙内表面
y0, y1, z0, z1 = -1.35, -0.18, 0.82, 2.4  # 窗洞
t = 0.14
box("left_wall_back", (t, -y1, 3.0), (LX - t / 2, y1 / 2, 1.5), plaster, R)
box("left_wall_front", (t, 1.5, 3.0), (LX - t / 2, y0 - 0.75, 1.5), plaster, R)
box("left_wall_low", (t, y1 - y0, z0), (LX - t / 2, (y0 + y1) / 2, z0 / 2), plaster, R)
box("left_wall_high", (t, y1 - y0, 3.0 - z1), (LX - t / 2, (y0 + y1) / 2, (z1 + 3.0) / 2), plaster, R)
box("floor", (6, 6, 0.02), (0, -2.0, -0.01), floor, R)
box("ceiling", (6, 6, 0.02), (0, -2.0, 3.0), plaster, R)
# 窗框：外框 + 一根竖梃 + 一根横梃
fw = 0.045
cy, cz = (y0 + y1) / 2, (z0 + z1) / 2
for (sy, sz, py, pz) in [
    (y1 - y0, fw, cy, z0 + fw / 2), (y1 - y0, fw, cy, z1 - fw / 2),
    (fw, z1 - z0, y0 + fw / 2, cz), (fw, z1 - z0, y1 - fw / 2, cz),
    (fw * 0.8, z1 - z0, cy, cz), (y1 - y0, fw * 0.8, cy, z0 + (z1 - z0) * 0.62),
]:
    box("window_frame", (0.06, sy, sz), (LX - 0.06, py, pz), frame_m, R, bevel=0.004)
glass = mat("glass", "#FFFFFF", 0.0, trans=1.0, ior=1.5)
gl = box("window_glass", (0.006, y1 - y0, z1 - z0), (LX - 0.07, cy, cz), glass, R)
gl.visible_shadow = False
box("sill", (0.22, y1 - y0 + 0.1, 0.03), (LX + 0.04, cy, z0 - 0.015), plaster, R, bevel=0.005)
# 窗外：一张很亮的照片（G04）
outside = img_mat("outside", ASSETS + "/images/G04_a.png", 1.0, alpha=False, emit=1.3)
o = plane("outside", 9.0, 6.0, (-5.5, -1.0, 1.6), outside, R, rot=(math.pi / 2, 0, math.pi / 2))
o.visible_shadow = False
# 纱帘：带褶皱的亚麻，半透光
me = bpy.data.meshes.new("curtain")
bmc = bmesh.new()
nu, nv = 60, 40
W, H = 0.42, 2.2
uvl = bmc.loops.layers.uv.new()
grid = []
for i in range(nu + 1):
    row = []
    for j in range(nv + 1):
        u, v = i / nu, j / nv
        x = math.sin(u * math.pi * 9) * 0.025 + math.sin(u * math.pi * 3.3) * 0.01
        row.append(bmc.verts.new((x, -u * W, v * H)))
    grid.append(row)
for i in range(nu):
    for j in range(nv):
        f = bmc.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
        for l, (a, b) in zip(f.loops, [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]):
            l[uvl].uv = (a / nu * 2, b / nv * 5)
bmc.to_mesh(me)
bmc.free()
cur = new_obj("curtain", me, R)
cur.location = (LX + 0.07, y0 + W + 0.02, 0.25)
smooth(cur)
cm = linen.copy()
cm.name = "curtain_linen"
cb = bsdf(cm.node_tree)
cb.inputs["Transmission Weight"].default_value = 0.65
cb.inputs["Base Color"].default_value = lin("#FBF7EE")
for l in list(cm.node_tree.links):
    if l.to_socket == cb.inputs["Base Color"]:
        cm.node_tree.links.remove(l)
assign(cur, cm)

# ── 洞洞板 ──
pb = bpy.data.materials.get("pegboard") or bpy.data.materials.new("pegboard")
pb.use_nodes = True
nt = pb.node_tree
for n in list(nt.nodes):
    if n.type != "OUTPUT_MATERIAL" and n.type != "BSDF_PRINCIPLED":
        nt.nodes.remove(n)
bs = bsdf(nt)
BW, BH = 1.7, 0.92
tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping")
mp.inputs["Scale"].default_value = (BW / 0.04, BH / 0.04, 1)
ti = nt.nodes.new("ShaderNodeTexImage"); ti.image = bpy.data.images.load(ROOT + "/tex/hole.png", check_existing=True)
tb = nt.nodes.new("ShaderNodeTexImage"); tb.image = bpy.data.images.load(ROOT + "/tex/hole_bump.png", check_existing=True)
tb.image.colorspace_settings.name = "Non-Color"
bu = nt.nodes.new("ShaderNodeBump"); bu.inputs["Strength"].default_value = 0.7
nt.links.new(tc.outputs["UV"], mp.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], ti.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], tb.inputs["Vector"])
nt.links.new(ti.outputs["Color"], bs.inputs["Base Color"]); nt.links.new(tb.outputs["Color"], bu.inputs["Height"]); nt.links.new(bu.outputs["Normal"], bs.inputs["Normal"])
bs.inputs["Roughness"].default_value = 0.42
bs.inputs["Coat Weight"].default_value = 0.2
BX, BZ, BY = 0.05, 1.34, -0.035
plane("pegboard", BW, BH, (BX, BY, BZ), pb, BD)
box("pegboard_body", (BW, 0.016, BH), (BX, BY + 0.0085, BZ), mat("board_edge", "#F3F1EC", 0.45), BD, bevel=0.003)
for x in (BX - BW / 2 + 0.04, BX + BW / 2 - 0.04):
    for z in (BZ - BH / 2 + 0.04, BZ + BH / 2 - 0.04):
        cyl("standoff", 0.011, 0.012, (x, BY - 0.004, z), alu, BD, rot=(math.pi / 2, 0, 0), bevel=0.002)


def rail(z, x0, x1):
    y = BY - 0.028
    box("rail", (x1 - x0, 0.014, 0.024), ((x0 + x1) / 2, y, z), alu, BD, bevel=0.004)
    for x in (x0 + 0.035, x1 - 0.035):
        cyl("rail_mount", 0.013, 0.03, (x, y + 0.015, z), alu, BD, rot=(math.pi / 2, 0, 0), bevel=0.003)
    return y


rail(1.65, -0.72, 0.82)

# ── 桌面 ──
DESK_Z = 0.75
box("desk", (3.0, 0.95, 0.035), (0.35, -0.475, DESK_Z - 0.0175), oak, DK, bevel=0.004)
box("desk_apron", (3.0, 0.04, 0.12), (0.35, -0.93, DESK_Z - 0.095), oak, DK, bevel=0.003)

# ── 灯光 ──
w = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
sc.world = w
w.use_nodes = True
wn = w.node_tree
for n in list(wn.nodes):
    if n.type == "TEX_ENVIRONMENT":
        wn.nodes.remove(n)
env = wn.nodes.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(ASSETS + "/hdri/H02_kloofendal_43d_clear_puresky_2k.hdr", check_existing=True)
wn.links.new(env.outputs["Color"], bg_node(wn).inputs["Color"])
bg_node(wn).inputs["Strength"].default_value = 0.55
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
LT.objects.link(sun)
sun.data.energy = 7.0
sun.data.angle = math.radians(1.2)
sun.data.color = (1.0, 0.72, 0.45)
d = Vector((0.85, 0.42, -0.24)).normalized()
sun.rotation_euler = (-d).to_track_quat("Z", "Y").to_euler()
fill = bpy.data.objects.new("fill", bpy.data.lights.new("fill", "AREA"))
LT.objects.link(fill)
fill.location = (0.6, -2.4, 1.6)
fill.data.energy = 48
fill.data.size = 2.5
fill.data.color = (1.0, 0.95, 0.88)
fill.rotation_euler = (Vector((0.1, 0, 1.3)) - fill.location).to_track_quat("-Z", "Y").to_euler()

# ── 相机 ──
cam_d = bpy.data.cameras.get("cam") or bpy.data.cameras.new("cam")
cam = bpy.data.objects.get("cam") or bpy.data.objects.new("cam", cam_d)
if cam.name not in sc.collection.objects:
    sc.collection.objects.link(cam)
cam.location = (0.09, -2.38, 1.4)
aim = Vector((0.09, 0.0, 1.16))
cam.rotation_euler = (aim - cam.location).to_track_quat("-Z", "Y").to_euler()
cam_d.lens = 45
cam_d.dof.use_dof = True
cam_d.dof.focus_distance = 2.32
cam_d.dof.aperture_fstop = 5.6
sc.camera = cam

r = sc.render
r.engine = "CYCLES"
sc.cycles.device = "GPU"
sc.cycles.samples = 64
sc.cycles.use_denoising = True
r.resolution_x, r.resolution_y = 1600, 900
sc.view_settings.view_transform = "AgX"
sc.view_settings.look = "AgX - Medium High Contrast"
result = {"ok": True}
