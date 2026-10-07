"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { grab } from "./gesture";
import { createCrtScreen } from "./crtScreen";
import layout from "./workbench-layout.json";

/**
 * 开场工作台里"活"的部分：真 3D（three.js）。
 * 相机和 Blender 那台一模一样（参数从 Blender 导出到 workbench-layout.json），背景是同机位渲出来的照片，
 * 所以挂件、香蕉猫和照片严丝合缝；挂件会晃、会转、影子投在洞洞板上，显示器屏幕一直在"生成"。
 *
 * 坐标：Blender (x, y, z) → three (x, z, -y)，导出 glb 时已经换好。
 */

type Vec3 = [number, number, number];
type Gid = "prompt" | "model" | "work" | "ghost1" | "ghost2";
type Pick = Gid | "cat";

const L = layout as unknown as {
  camera: { position: Vec3; target: Vec3; lens: number; sensor: number };
  sun: { dir: Vec3; color: Vec3 };
  charms: Record<Gid, Vec3>;
  hookLow: Record<Gid, Vec3>;
  shelf: { top: number; x0: number; x1: number; front: number; back: number };
  board: number;
};

const SLOTS: { id: Gid; file: string; src: Gid }[] = [
  { id: "prompt", file: "charm_prompt", src: "prompt" },
  { id: "model", file: "charm_model", src: "model" },
  { id: "work", file: "charm_work", src: "work" },
  { id: "ghost1", file: "charm_ghost", src: "ghost1" },
  { id: "ghost2", file: "charm_ghost", src: "ghost1" },
];
const CHANNEL: Partial<Record<Gid, string>> = { prompt: "prompt", model: "model", work: "work" };

type Body = { a: number; w: number; tw: number; tv: number; drop: number; vy: number; drag: boolean; fly: number; group: THREE.Group; body: THREE.Group; home: THREE.Vector3 };

const v3 = (p: Vec3) => new THREE.Vector3(p[0], p[1], p[2]);

export function HangingCharms({
  active,
  visible,
  plate,
  onPick,
  onHover,
}: {
  active: boolean;
  visible: boolean;
  plate: string;
  onPick: (id: string) => void;
  onHover: (id: string | null, x: number, y: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ drop: () => void } | null>(null);
  const props = useRef({ visible, onPick, onHover });
  useEffect(() => {
    props.current = { visible, onPick, onHover };
  }, [visible, onPick, onHover]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.AgXToneMapping; // 和 Blender 出图一样用 AgX
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.42;

    // ───── 相机：和 Blender 一致 ─────
    const hfov = 2 * Math.atan(L.camera.sensor / 2 / L.camera.lens);
    const vfov = 2 * Math.atan(Math.tan(hfov / 2) * (9 / 16));
    const camera = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(vfov), 16 / 9, 0.05, 40);
    camera.position.copy(v3(L.camera.position));
    camera.lookAt(v3(L.camera.target));
    scene.add(camera);

    // 背景照片：贴在相机正前方铺满画面，不参与色调映射（保持 Blender 原色）。
    // 也让显示器玻璃这类透明材质能"透"出后面的墙。
    const texLoader = new THREE.TextureLoader();
    texLoader.load(plate, (t) => {
      if (disposed) return t.dispose();
      t.colorSpace = THREE.SRGBColorSpace;
      const d = 30;
      const h = 2 * d * Math.tan(vfov / 2);
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(h * (16 / 9), h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false, depthWrite: false }));
      bg.position.z = -d;
      bg.renderOrder = -1;
      camera.add(bg);
    });

    // ───── 灯：和 Blender 里的夕阳同方向 ─────
    const sunDir = v3(L.sun.dir).normalize();
    const sun = new THREE.DirectionalLight(new THREE.Color(...L.sun.color), 3.2);
    const target = new THREE.Object3D();
    target.position.set(0.1, 1.35, 0);
    scene.add(target);
    sun.target = target;
    sun.position.copy(target.position).addScaledVector(sunDir, -3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.radius = 7;
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.002;
    Object.assign(sun.shadow.camera, { left: -1.3, right: 1.3, top: 0.9, bottom: -0.9, near: 0.5, far: 6 });
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0xffe4c8, 0xb8946c, 0.7)); // 暖色天光 + 木桌反光

    // 接影子的隐形面：洞洞板正面 + 置物架上面
    const shadowMat = new THREE.ShadowMaterial({ color: 0x5a3c22, opacity: 0.15 });
    const boardCatch = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3), shadowMat);
    boardCatch.position.set(0.05, 1.32, L.board + 0.001);
    boardCatch.receiveShadow = true;
    scene.add(boardCatch);
    const S = L.shelf;
    const shelfCatch = new THREE.Mesh(new THREE.PlaneGeometry(S.x1 - S.x0, S.front - S.back), shadowMat);
    shelfCatch.rotation.x = -Math.PI / 2;
    shelfCatch.position.set((S.x0 + S.x1) / 2, S.top + 0.0008, (S.front + S.back) / 2);
    shelfCatch.receiveShadow = true;
    scene.add(shelfCatch);

    // ───── 显示器屏幕 ─────
    const crt = createCrtScreen();
    const crtTex = new THREE.CanvasTexture(crt.canvas);
    crtTex.colorSpace = THREE.SRGBColorSpace;
    crtTex.flipY = false; // glTF 的 UV 约定
    crtTex.anisotropy = 4;
    const crtMat = new THREE.MeshBasicMaterial({ map: crtTex, toneMapped: false, color: 0xf2f2f2 });

    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.05, clearcoat: 1, depthWrite: false });
    // 透明亚克力块：不走折射（会把里面的照片糊掉），用很淡的透明 + 清漆高光，边缘靠反光勾出来
    const caseMat = new THREE.MeshPhysicalMaterial({ color: 0xf4f8ff, transparent: true, opacity: 0.16, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, specularIntensity: 1, envMapIntensity: 2.2, depthWrite: false })
    const frostMat = new THREE.MeshPhysicalMaterial({ color: 0xfbf8f2, transparent: true, opacity: 0.62, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.2 });

    // ───── 挂件 ─────
    const bodies = {} as Record<Gid, Body>;
    const pickables: THREE.Object3D[] = [];
    const loader = new GLTFLoader();
    const tag = (root: THREE.Object3D, id: Pick) =>
      root.traverse((o) => {
        o.userData.gid = id;
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          pickables.push(m);
        }
      });

    for (const s of SLOTS) {
      const home = v3(L.charms[s.id]);
      const group = new THREE.Group();
      group.position.copy(home);
      group.rotation.order = "ZYX";
      scene.add(group);
      // 钩子挂在杆上只会左右摆；钩子下面的本体还能绕吊绳扭转
      const srcPivot = v3(L.charms[s.src]);
      const srcLow = v3(L.hookLow[s.src]);
      const body = new THREE.Group();
      body.position.copy(srcLow).sub(srcPivot);
      group.add(body);
      bodies[s.id] = { a: 0, w: 0, tw: 0, tv: 0, drop: 0, vy: 0, drag: false, fly: 0, group, body, home };
      loader.load(
        `/open/3d/${s.file}.glb`,
        (g) => {
          if (disposed) return;
          const model = g.scene; // 世界坐标的模型，挪到挂点下
          model.position.copy(srcPivot).multiplyScalar(-1);
          const inner = new THREE.Group();
          inner.position.copy(srcLow).multiplyScalar(-1);
          body.add(inner);
          for (const n of [...model.children]) if (!/^hook_/.test(n.name)) inner.add(n);
          for (const root of [model, inner])
            root.traverse((o) => {
              const m = o as THREE.Mesh;
              if (!m.isMesh) return;
              if (/^crt_screen(?!_well)/.test(m.name)) m.material = crtMat;
              else if (/^crt_glass/.test(m.name)) m.material = glassMat; // 屏幕玻璃：薄薄一层反光，别把屏幕糊掉
              else if (/^ghost_card/.test(m.name)) m.material = frostMat;
              else if (/^case(?!_ring)/.test(m.name)) m.material = caseMat; // 拍立得的亚克力封装
            });
          tag(model, s.id);
          tag(inner, s.id);
          group.add(model);
        },
        undefined,
        () => {}, // 页面跳走时请求会被取消，不用报错
      );
    }

    // ───── 挂杆：也是真 3D，钩子才能真的套在杆上 ─────
    loader.load(
      "/open/3d/rail.glb",
      (g) => {
        if (disposed) return;
        g.scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.castShadow = true;
            m.receiveShadow = true;
          }
        });
        scene.add(g.scene);
      },
      undefined,
      () => {},
    );

    // ───── 香蕉猫：用它自己的动画原地跑 ─────
    let mixer: THREE.AnimationMixer | null = null;
    let catAction: THREE.AnimationAction | null = null;
    let catRoot: THREE.Object3D | null = null;
    let catBase = 0;
    const cat = { boost: 0, hop: 0, hv: 0 };
    loader.load("/open/3d/cat.glb", (g) => {
      if (disposed) return;
      catRoot = g.scene;
      catBase = catRoot.position.y;
      tag(catRoot, "cat");
      catRoot.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.frustumCulled = false; // 蒙皮网格的包围盒不准，别被误裁掉
          const mat = m.material as THREE.MeshStandardMaterial;
          mat.roughness = Math.max(0.45, mat.roughness);
          mat.color.multiply(new THREE.Color(1.0, 0.9, 0.8)); // 跟照片里的暖光对齐
        }
      });
      scene.add(catRoot);
      if (g.animations[0]) {
        mixer = new THREE.AnimationMixer(catRoot);
        catAction = mixer.clipAction(g.animations[0]);
        catAction.play();
        if (reduced) catAction.timeScale = 0;
      }
    }, undefined, () => {});

    // ───── 阳光里的灰尘 ─────
    const DUST = reduced ? 0 : 160;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(DUST * 3);
    const dustSeed = new Float32Array(DUST);
    for (let i = 0; i < DUST; i++) {
      dustPos[i * 3] = -1.0 + Math.random() * 1.9;
      dustPos[i * 3 + 1] = 0.85 + Math.random() * 1.1;
      dustPos[i * 3 + 2] = 0.12 + Math.random() * 1.1;
      dustSeed[i] = Math.random() * 100;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dc = document.createElement("canvas");
    dc.width = dc.height = 32;
    const dctx = dc.getContext("2d")!;
    const rg = dctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    rg.addColorStop(0, "rgba(255,240,215,1)");
    rg.addColorStop(1, "rgba(255,240,215,0)");
    dctx.fillStyle = rg;
    dctx.fillRect(0, 0, 32, 32);
    const dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({ map: new THREE.CanvasTexture(dc), size: 0.006, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    );
    scene.add(dust);

    // ───── 尺寸 ─────
    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // ───── 拾取 / 拖拽 ─────
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pick = (cx: number, cy: number): Pick | null => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pickables, false)[0];
      return hit ? (hit.object.userData.gid as Pick) : null;
    };
    const screenOf = (v: THREE.Vector3) => {
      const r = renderer.domElement.getBoundingClientRect();
      const p = v.clone().project(camera);
      return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
    };
    const isCharm = (p: Pick | null): p is Gid => !!p && p !== "cat";

    let hover: Pick | null = null;
    let lastX = 0;
    let armed: { id: Gid; until: number } | null = null; // 手机：第一下先甩，第二下才进
    let dragging: { id: Gid; pivot: { x: number; y: number }; sx: number; sy: number; prevA: number; prevT: number; touch: boolean } | null = null;
    let tipTimer = 0;

    const showTip = (id: Gid) => {
      const ch = CHANNEL[id];
      if (!ch) return;
      const p = screenOf(bodies[id].group.position.clone().add(new THREE.Vector3(0, -0.12, 0)));
      props.current.onHover(ch, p.x - 40, p.y);
      window.clearTimeout(tipTimer);
      tipTimer = window.setTimeout(() => props.current.onHover(null, 0, 0), 2200);
    };
    const flyTo = (id: Gid) => {
      const ch = CHANNEL[id];
      const b = bodies[id];
      if (ch) {
        b.fly = 0.0001;
        props.current.onHover(null, 0, 0);
        window.setTimeout(() => props.current.onPick(ch), 520);
      } else {
        b.tv += 9; // 还没上线的卡片：转一圈
        b.w += 2;
      }
    };
    const poke = (id: Gid, v: number) => {
      bodies[id].w += v * 0.05;
      bodies[id].tv += v * 0.08;
    };
    const catTap = () => {
      cat.boost = 1.6;
      cat.hv = 0.55;
    };

    const onMove = (e: PointerEvent) => {
      const vx = e.clientX - lastX;
      lastX = e.clientX;
      if (dragging) {
        const b = bodies[dragging.id];
        const a = Math.atan2(-(e.clientX - dragging.pivot.x), Math.max(20, e.clientY - dragging.pivot.y));
        const now = performance.now();
        b.w = (a - dragging.prevA) / Math.max(0.001, (now - dragging.prevT) / 1000);
        b.a = dragging.prevA = Math.max(-1.1, Math.min(1.1, a));
        b.tv += vx * 0.02;
        dragging.prevT = now;
        return;
      }
      if (e.pointerType === "touch") return;
      const id = pick(e.clientX, e.clientY);
      if (isCharm(id) && id !== hover) poke(id, Math.max(-40, Math.min(40, vx))); // 划过：顺着鼠标推一下
      if (id !== hover) {
        hover = id;
        renderer.domElement.style.cursor = id === "cat" ? "pointer" : id ? "grab" : "default";
      }
      props.current.onHover(isCharm(id) && CHANNEL[id] ? CHANNEL[id]! : null, e.clientX, e.clientY);
    };
    const onDown = (e: PointerEvent) => {
      const id = pick(e.clientX, e.clientY);
      if (!id) return;
      if (id === "cat") {
        catTap();
        return;
      }
      grab.active = true;
      renderer.domElement.setPointerCapture(e.pointerId);
      const b = bodies[id];
      b.drag = true;
      dragging = { id, pivot: screenOf(b.group.position), sx: e.clientX, sy: e.clientY, prevA: b.a, prevT: performance.now(), touch: e.pointerType === "touch" };
      renderer.domElement.style.cursor = "grabbing";
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      const d = dragging;
      dragging = null;
      grab.active = false;
      const b = bodies[d.id];
      b.drag = false;
      b.w = Math.max(-8, Math.min(8, b.w));
      renderer.domElement.style.cursor = hover ? "grab" : "default";
      if (e.type !== "pointerup" || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) >= 6) return;
      if (d.touch && CHANNEL[d.id] && !(armed && armed.id === d.id && armed.until > performance.now())) {
        armed = { id: d.id, until: performance.now() + 2600 };
        poke(d.id, 30);
        showTip(d.id);
        return;
      }
      armed = null;
      flyTo(d.id);
    };
    const onLeave = () => {
      hover = null;
      props.current.onHover(null, 0, 0);
    };
    const cv = renderer.domElement;
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onUp);
    cv.addEventListener("pointerleave", onLeave);

    // 手机倾斜：挂件跟着往低的一边偏（不需要授权的浏览器才有）
    let tilt = 0;
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null) return;
      tilt = Math.max(-0.5, Math.min(0.5, (-e.gamma / 90) * 0.9));
    };
    const needsPermission = typeof DeviceOrientationEvent !== "undefined" && "requestPermission" in DeviceOrientationEvent;
    if (!reduced && !needsPermission) window.addEventListener("deviceorientation", onTilt);

    // ───── 进场：从上面掉下来 ─────
    api.current = {
      drop() {
        SLOTS.forEach((s, i) => {
          const b = bodies[s.id];
          b.fly = 0;
          b.drag = false;
          b.group.scale.setScalar(1);
          if (reduced) {
            b.a = b.w = b.tw = b.tv = b.drop = b.vy = 0;
            return;
          }
          b.drop = 0.45 + i * 0.07;
          b.vy = 0;
          b.a = (i % 2 ? 1 : -1) * (0.2 + (i % 3) * 0.06);
          b.w = 0;
          b.tw = (i % 2 ? -1 : 1) * 0.8;
          b.tv = 0;
        });
      },
    };

    // ───── 循环 ─────
    const camTarget = new THREE.Vector3(L.camera.position[0], 1.5, 1.3);
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let screenAcc = 0;
    const STEP = 1 / 120;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!props.current.visible) {
        last = now;
        return;
      }
      const dt = Math.min(0.1, (now - last) / 1000);
      acc += dt;
      last = now;
      const t = now / 1000;
      while (acc >= STEP) {
        acc -= STEP;
        for (const s of SLOTS) {
          const b = bodies[s.id];
          if (!b.drag) {
            b.w += (-26 * Math.sin(b.a - tilt) - 1.2 * b.w) * STEP;
            b.a += b.w * STEP;
          }
          // 绕吊绳的扭转：弹簧更软，慢慢停
          b.tv += (-9 * b.tw - 0.9 * b.tv) * STEP;
          b.tw += b.tv * STEP;
          b.vy += (-110 * b.drop - 11 * b.vy) * STEP;
          b.drop += b.vy * STEP;
          if (b.fly > 0) b.fly = Math.min(1, b.fly + STEP * 1.9);
        }
        // 猫：点一下跑得更快，还跳一下
        if (cat.hop > 0 || cat.hv > 0) {
          cat.hv -= 9.8 * STEP;
          cat.hop += cat.hv * STEP;
          if (cat.hop <= 0) cat.hop = cat.hv = 0;
        }
        cat.boost = Math.max(0, cat.boost - STEP * 0.9);
      }
      for (const s of SLOTS) {
        const b = bodies[s.id];
        const g = b.group;
        const f = b.fly;
        const e = f * f * (3 - 2 * f);
        g.position.set(b.home.x, b.home.y + b.drop, b.home.z).lerp(camTarget, e * 0.85);
        g.rotation.set(0, e * Math.PI * 2, b.a * (1 - e));
        b.body.rotation.y = b.tw * (1 - e);
        g.scale.setScalar(1 + e * 0.15);
      }
      if (mixer) {
        if (catAction && !reduced) catAction.timeScale = 1 + cat.boost * 1.4;
        mixer.update(dt);
      }
      if (catRoot) catRoot.position.y = catBase + cat.hop;
      // 灰尘：慢慢飘
      if (DUST) {
        const p = dustGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < DUST; i++) {
          const sd = dustSeed[i];
          p.setXYZ(
            i,
            dustPos[i * 3] + Math.sin(t * 0.13 + sd) * 0.06,
            dustPos[i * 3 + 1] + Math.sin(t * 0.09 + sd * 1.7) * 0.05 - ((t * 0.006 + sd) % 0.3) + 0.15,
            dustPos[i * 3 + 2] + Math.cos(t * 0.11 + sd) * 0.04,
          );
        }
        p.needsUpdate = true;
      }
      // 屏幕 20 帧够了
      screenAcc += dt;
      if (screenAcc > 0.05) {
        crt.draw(t, screenAcc);
        crtTex.needsUpdate = true;
        screenAcc = 0;
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(tipTimer);
      ro.disconnect();
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointercancel", onUp);
      cv.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("deviceorientation", onTilt);
      const disposeMat = (m: THREE.Material) => {
        for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
        m.dispose();
      };
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh || (o as THREE.Points).isPoints) {
          m.geometry.dispose();
          (Array.isArray(m.material) ? m.material : [m.material]).forEach(disposeMat);
        }
      });
      camera.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          disposeMat(m.material as THREE.Material);
        }
      });
      mixer?.stopAllAction();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      cv.remove();
      api.current = null;
    };
  }, [plate]);

  useEffect(() => {
    if (active) api.current?.drop();
  }, [active]);

  return <div ref={host} className="absolute inset-0" />;
}
