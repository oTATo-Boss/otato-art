"""开场工作台场景的公用函数（在 Mac 的 Blender 里通过 MCP 运行）。"""
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

# 界面是中文时，新建节点的名字也会被翻译（「原理化 BSDF」），这里关掉，并且一律按类型找节点
bpy.context.preferences.view.use_translate_new_dataname = False


def bsdf(nt):
    return next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")


def bg_node(nt):
    return next(n for n in nt.nodes if n.type == "BACKGROUND")

ROOT = os.path.dirname(os.path.abspath(__file__))  # 3d/workbench，所有路径都相对项目
ASSETS = ROOT + "/assets/codex"   # Codex 下载的模型/贴图/HDRI（只拷了用到的）
EXTRA = ROOT + "/assets/extra"     # 用户收集的模型素材
MORE = EXTRA + "/unzipped"
TOY = ROOT + "/models"  # 公仔 glb 复制进项目里，不依赖桌面文件夹


def lin(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple([x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1.0])


def coll(name, parent=None):
    c = bpy.data.collections.get(name)
    if c is None:
        c = bpy.data.collections.new(name)
        (parent or bpy.context.scene.collection).children.link(c)
    return c


def clear_coll(name):
    c = bpy.data.collections.get(name)
    if not c:
        return
    for o in list(c.all_objects):
        bpy.data.objects.remove(o, do_unlink=True)


def link(o, c):
    for uc in list(o.users_collection):
        uc.objects.unlink(o)
    c.objects.link(o)
    return o


def mat(name, color, rough=0.5, metal=0.0, coat=0.0, trans=0.0, ior=1.45, sss=0.0, spec=0.5):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = bsdf(m.node_tree)
    b.inputs["Base Color"].default_value = lin(color) if isinstance(color, str) else color
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Transmission Weight"].default_value = trans
    b.inputs["IOR"].default_value = ior
    b.inputs["Subsurface Weight"].default_value = sss
    b.inputs["Specular IOR Level"].default_value = spec
    return m


def pbr(name, folder, scale=1.0, tint=None):
    """按贴图文件夹里的 diff/nor_gl/rough/ao 自动连线（Poly Haven 和 ambientCG 命名都认）"""
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = bsdf(nt)
    files = os.listdir(folder)

    def find(*keys):
        for f in files:
            fl = f.lower()
            if fl.endswith((".png", ".jpg", ".exr")) and any(k in fl for k in keys):
                return os.path.join(folder, f)

    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (scale, scale, scale)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])

    def img(path, noncolor):
        t = nt.nodes.new("ShaderNodeTexImage")
        t.projection = "BOX"
        t.projection_blend = 0.25
        t.image = bpy.data.images.load(path, check_existing=True)
        if noncolor:
            t.image.colorspace_settings.name = "Non-Color"
        nt.links.new(mp.outputs["Vector"], t.inputs["Vector"])
        return t

    d = find("_diff", "_color", "albedo")
    if d:
        t = img(d, False)
        if tint:
            mix = nt.nodes.new("ShaderNodeMixRGB")
            mix.blend_type = "MULTIPLY"
            mix.inputs[0].default_value = 1.0
            mix.inputs[2].default_value = lin(tint)
            nt.links.new(t.outputs["Color"], mix.inputs[1])
            nt.links.new(mix.outputs[0], b.inputs["Base Color"])
        else:
            nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    r = find("_rough")
    if r:
        nt.links.new(img(r, True).outputs["Color"], b.inputs["Roughness"])
    n = find("nor_gl", "normalgl")
    if n:
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(img(n, True).outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    mt = find("_metal")
    if mt and "linen" not in name:
        nt.links.new(img(mt, True).outputs["Color"], b.inputs["Metallic"])
    return m


def img_mat(name, path, rough=0.5, alpha=True, coat=0.0, emit=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        if n.type == "TEX_IMAGE":
            nt.nodes.remove(n)
    b = bsdf(nt)
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = bpy.data.images.load(path, check_existing=True)
    t.interpolation = "Cubic"
    nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    if alpha:
        nt.links.new(t.outputs["Alpha"], b.inputs["Alpha"])
    if emit:
        nt.links.new(t.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = emit
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


def new_obj(name, me, c):
    o = bpy.data.objects.new(name, me)
    c.objects.link(o)
    return o


def box(name, size, loc, m, c, bevel=0.0, segs=4, rot=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    bm.to_mesh(me)
    bm.free()
    o = new_obj(name, me, c)
    o.location = loc
    o.rotation_euler = rot
    if bevel:
        md = o.modifiers.new("bevel", "BEVEL")
        md.width = bevel
        md.segments = segs
        md.limit_method = "NONE"
    smooth(o)
    return assign(o, m)


def cyl(name, r, depth, loc, m, c, rot=(0, 0, 0), verts=64, bevel=0.0):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r, depth=depth)
    bm.to_mesh(me)
    bm.free()
    o = new_obj(name, me, c)
    o.location = loc
    o.rotation_euler = rot
    if bevel:
        md = o.modifiers.new("bevel", "BEVEL")
        md.width = bevel
        md.segments = 4
        md.limit_method = "ANGLE"
    smooth(o)
    return assign(o, m)


def plane(name, w, h, loc, m, c, rot=(math.pi / 2, 0, 0)):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
    uv = bm.loops.layers.uv.new()
    for f in bm.faces:
        for l in f.loops:
            l[uv].uv = (l.vert.co.x + 0.5, l.vert.co.y + 0.5)
    for v in bm.verts:
        v.co.x *= w
        v.co.y *= h
    bm.to_mesh(me)
    bm.free()
    o = new_obj(name, me, c)
    o.location = loc
    o.rotation_euler = rot
    return assign(o, m)


def append_asset(blend, c, keep=None, drop=("wdg_", "hlp_", "Camera", "Hemi", "MainCam", "Water", "Table", "Plate", "Knife", "Glass")):
    """把一个 .blend 里的物体追加进来，挂到一个空物体下；返回（空物体, 物体列表, 尺寸）"""
    with bpy.data.libraries.load(blend, link=False) as (src, dst):
        names = [n for n in src.objects if (keep is None or any(k in n for k in keep)) and not any(n.startswith(d) for d in drop)]
        dst.objects = names
    objs = [o for o in dst.objects if o is not None]
    root = bpy.data.objects.new(os.path.basename(blend).split(".")[0] + "_root", None)
    c.objects.link(root)
    for o in objs:
        c.objects.link(o)
    bpy.context.view_layer.update()
    tops = [o for o in objs if o.parent is None or o.parent not in objs]
    pts = [o.matrix_world @ Vector(v) for o in objs if o.type in ("MESH", "CURVE") for v in o.bound_box]
    if not pts:
        print("no mesh in", blend, [(o.name, o.type) for o in objs])
        pts = [Vector((-0.1, -0.1, 0)), Vector((0.1, 0.1, 0.2))]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    # 原点放到底面中心
    off = Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    for o in tops:
        o.parent = root
        o.matrix_parent_inverse = Matrix.Translation(-off)
    return root, objs, mx - mn


def place(root, loc, height=None, size=None, yaw_deg=0.0, scale=None):
    if scale is None and height is not None:
        scale = height / size.z
    root.scale = (scale or 1.0,) * 3
    root.location = loc
    root.rotation_euler = (0, 0, math.radians(yaw_deg))
    return root


def apply_mods(o):
    with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o]):
        for md in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=md.name)


def open_box(name, loc, w, d, h, m, c, t=0.005, r=0.012):
    """开口朝上、四角圆润、壁厚 t 的盒子；loc 是底面中心"""
    x, y, z = loc
    outer = box(name, (w, d, h), (x, y, z + h / 2), m, c, bevel=r, segs=6)
    apply_mods(outer)
    cut = box(name + "_cut", (w - 2 * t, d - 2 * t, h), (x, y, z + t + h / 2), m, c, bevel=max(0.002, r - t), segs=6)
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
    return outer


def torus(name, R, r, loc, m, c, rot=(math.pi / 2, 0, 0)):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    seg, sub = 40, 12
    verts = []
    for i in range(seg):
        a = i / seg * 2 * math.pi
        ring = []
        for j in range(sub):
            b = j / sub * 2 * math.pi
            ring.append(bm.verts.new(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b))))
        verts.append(ring)
    for i in range(seg):
        for j in range(sub):
            bm.faces.new((verts[i][j], verts[(i + 1) % seg][j], verts[(i + 1) % seg][(j + 1) % sub], verts[i][(j + 1) % sub]))
    bm.to_mesh(me)
    bm.free()
    o = new_obj(name, me, c)
    o.location = loc
    o.rotation_euler = rot
    smooth(o)
    return assign(o, m)


def text(name, body, loc, size, m, c, font=None, extrude=0.0006, rot=(math.pi / 2, 0, 0), align="CENTER"):
    cu = bpy.data.curves.new(name, "FONT")
    cu.body = body
    if font:
        cu.font = bpy.data.fonts.load(font, check_existing=True)
    cu.size = size
    cu.extrude = extrude
    cu.align_x = align
    cu.align_y = "CENTER"
    o = new_obj(name, cu, c)
    o.location = loc
    o.rotation_euler = rot
    o.data.materials.append(m)
    return o


def import_glb(path, c, height, loc, yaw=0.0, tilt=(0.0, 0.0), outlier=4.0, skip=()):
    """导入 glb，按真实网格包围盒（剔除离群的大背景网格）缩放到指定高度，底面中心落在 loc"""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        link(o, c)
    bpy.context.view_layer.update()
    def invisible(o):
        # 全透明（Alpha=0 且没接贴图）的网格，多半是碰撞体/占位，不算进包围盒
        ms = [sl.material for sl in o.material_slots if sl.material and sl.material.use_nodes]
        if not ms:
            return False
        for m in ms:
            b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
            if not b or b.inputs["Alpha"].is_linked or b.inputs["Alpha"].default_value > 0.01:
                return False
        return True

    for o in [o for o in new if any(o.name.startswith(k) for k in skip) or (o.type == "MESH" and invisible(o))]:
        o.hide_render = True
        o.hide_viewport = True
    meshes = [o for o in new if o.type == "MESH" and not o.hide_render]
    dims = []
    for o in meshes:
        pts = [o.matrix_world @ Vector(v) for v in o.bound_box]
        d = max(max(p[i] for p in pts) - min(p[i] for p in pts) for i in range(3))
        dims.append((o, pts, d))
    med = sorted(d for _, _, d in dims)[len(dims) // 2]
    keep = [(o, pts) for o, pts, d in dims if d <= med * outlier * 3 or len(dims) < 3]
    for o, _, d in dims:
        if d > med * outlier * 3 and len(dims) >= 3:
            o.hide_render = True
            o.hide_viewport = True
    pts = [p for _, ps in keep for p in ps]
    mn = Vector([min(p[i] for p in pts) for i in range(3)])
    mx = Vector([max(p[i] for p in pts) for i in range(3)])
    root = bpy.data.objects.new(os.path.basename(path).split(".")[0] + "_root", None)
    c.objects.link(root)
    for o in new:
        if o.parent is None:
            o.parent = root
    s = height / (mx.z - mn.z)
    root.scale = (s, s, s)
    root.rotation_euler = (math.radians(tilt[0]), math.radians(tilt[1]), math.radians(yaw))
    bpy.context.view_layer.update()
    # 再算一次世界包围盒，把底面中心挪到 loc
    pts = [o.matrix_world @ Vector(v) for o, _ in keep for v in o.bound_box]
    mn = Vector([min(p[i] for p in pts) for i in range(3)])
    mx = Vector([max(p[i] for p in pts) for i in range(3)])
    root.location += Vector(loc) - Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    return root, mx - mn
