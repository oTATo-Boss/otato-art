"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { grab } from "./gesture";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/**
 * 开场的 3D 钥匙扣：一枚 logo 挂件 + 三个产品吊牌，挂在一个金属圈上。
 * 鼠标划过会被拨动，点吊牌换到对应频道。
 */

export interface Tag {
  id: string;
  label: string;
  kind: "chrome" | "plastic" | "paper";
  color: string;
  ink: string;
}

type Swing = { az: number; vz: number; ax: number; vx: number; spin: number; vs: number; rest: number };

function textTexture(text: string, ink: string, family: string, w = 1024, h = 512) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, w, h);
  g.fillStyle = ink;
  g.textAlign = "center";
  g.textBaseline = "middle";
  let size = 260;
  g.font = `900 ${size}px ${family}`;
  while (g.measureText(text).width > w * 0.8 && size > 40) {
    size -= 10;
    g.font = `900 ${size}px ${family}`;
  }
  g.fillText(text, w / 2, h / 2 + size * 0.04);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

async function logoTexture() {
  const img = new Image();
  img.src = "/brand/otato-black.svg";
  await img.decode();
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 1024, 1024);
  g.drawImage(img, 92, 110, 840, 840);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function Keychain({
  tags,
  active,
  visible,
  onPick,
}: {
  tags: Tag[];
  active: boolean;
  visible: boolean;
  onPick: (id: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(visible);
  const pickRef = useRef(onPick);
  const dropRef = useRef(false);
  useEffect(() => {
    visibleRef.current = visible;
    pickRef.current = onPick;
  }, [visible, onPick]);
  // 每次切到开场，钥匙扣都从上面掉下来
  useEffect(() => {
    if (active) dropRef.current = true;
  }, [active]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = false;
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
    scene.environment = env;

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(4, 6, 8);
    scene.add(key);

    const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    cam.position.set(0, -0.2, 12);

    const chrome = new THREE.MeshStandardMaterial({ color: 0xf2f4f8, metalness: 1, roughness: 0.12 });

    // 顶部挂点 → 链条 → 金属圈。整个组从顶部挂点摆动。
    const R = 0.62;
    const ringY = 1.25;
    const top = 6;
    const root = new THREE.Group();
    root.position.set(0, top, 0);
    scene.add(root);
    const swingRoot: Swing = { az: 0, vz: 0, ax: 0, vx: 0, spin: 0, vs: 0, rest: 0 };

    const link = new THREE.TorusGeometry(0.15, 0.04, 16, 40);
    const linkCount = Math.floor((top - (ringY + R)) / 0.24);
    for (let i = 0; i < linkCount; i++) {
      const m = new THREE.Mesh(link, chrome);
      m.scale.set(0.8, 1.25, 1);
      m.position.set(0, -0.12 - i * 0.24, 0);
      m.rotation.y = i % 2 ? Math.PI / 2 : 0;
      root.add(m);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.065, 24, 96), chrome);
    ring.position.set(0, ringY - top, 0);
    ring.rotation.y = 0.35;
    root.add(ring);

    // 地上一团柔和的影子，跟着摆动移动
    const shadowTex = (() => {
      const c = document.createElement("canvas");
      c.width = 128;
      c.height = 128;
      const g = c.getContext("2d")!;
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, "rgba(20,20,30,0.5)");
      grd.addColorStop(0.45, "rgba(20,20,30,0.16)");
      grd.addColorStop(1, "rgba(20,20,30,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })();
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 1.0),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false }),
    );
    shadow.position.set(0, -3.35, -1.2);
    scene.add(shadow);

    // 挂件：从金属圈底部一圈挂下来
    type Charm = { pivot: THREE.Group; body: THREE.Object3D; swing: Swing; id?: string; hit: THREE.Object3D[] };
    const charms: Charm[] = [];
    const attach = (deg: number, z: number) => {
      const a = THREE.MathUtils.degToRad(deg);
      const pivot = new THREE.Group();
      pivot.position.set(Math.cos(a) * R, ringY - top + Math.sin(a) * R, z);
      root.add(pivot);
      const jr = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.032, 12, 32), chrome);
      jr.position.y = -0.1;
      jr.rotation.y = Math.PI / 2;
      pivot.add(jr);
      return pivot;
    };

    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-geist-sans").trim() || "sans-serif";

    const build = async () => {
      await document.fonts.ready;
      if (disposed) return;

      // logo 挂件：一枚白色亚克力圆片
      const lp = attach(-84, 0.3);
      // logo 多挂一节小链，垂得更低
      const extra = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.032, 12, 32), chrome);
      extra.position.y = -0.34;
      lp.add(extra);
      const ltex = await logoTexture();
      if (disposed) return;
      const face = new THREE.MeshPhysicalMaterial({ map: ltex, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });
      const side = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, clearcoat: 1, transmission: 0 });
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.16, 96), [side, face, face]);
      disc.rotation.x = Math.PI / 2;
      disc.rotation.y = Math.PI / 2;
      disc.position.y = -0.46 - 0.82;
      lp.add(disc);
      charms.push({ pivot: lp, body: disc, swing: { az: 0, vz: 0, ax: 0, vx: 0, spin: 0, vs: 0, rest: 0 }, hit: [disc] });

      // 产品吊牌
      const slots = [
        { deg: -34, z: -0.06 },
        { deg: -168, z: 0.0 },
        { deg: -124, z: 0.14 },
      ];
      tags.forEach((tg, i) => {
        const s = slots[i % slots.length];
        const pv = attach(s.deg, s.z);
        const w = 1.9;
        const h = 0.9;
        const mat =
          tg.kind === "chrome"
            ? new THREE.MeshStandardMaterial({ color: tg.color, metalness: 1, roughness: 0.14 })
            : tg.kind === "plastic"
              ? new THREE.MeshPhysicalMaterial({ color: tg.color, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.1 })
              : new THREE.MeshStandardMaterial({ color: tg.color, roughness: 0.85 });
        const body = new THREE.Group();
        const box = new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.14, 6, 0.06), mat);
        body.add(box);
        const tex = textTexture(tg.label, tg.ink, family);
        const lm = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false });
        const front = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, h * 0.92), lm);
        front.position.z = 0.074;
        body.add(front);
        const back = front.clone();
        back.position.z = -0.074;
        back.rotation.y = Math.PI;
        body.add(back);
        // 吊牌竖着挂：上端连在小环上
        body.rotation.z = Math.PI / 2;
        body.position.y = -0.22 - w / 2;
        pv.add(body);
        const ax = pv.position.x;
        charms.push({
          pivot: pv,
          body,
          id: tg.id,
          hit: [box, front],
          swing: { az: ax * 1.25, vz: 0, ax: 0, vx: 0, spin: 0, vs: 0, rest: ax * 1.25 },
        });
      });
    };
    build();

    // 尺寸
    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      // 手机上退远一点
      cam.position.z = w < 768 ? 19 : 12;
      cam.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // 鼠标：划过拨动，点吊牌换台
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let last = { x: 0, y: 0, t: 0 };
    let down: { x: number; y: number } | null = null;
    const hitTest = (cx: number, cy: number) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, cam);
      const all = charms.flatMap((c) => c.hit);
      const hit = ray.intersectObjects(all, false)[0];
      if (!hit) return null;
      return charms.find((c) => c.hit.includes(hit.object)) ?? null;
    };
    let grabbed: Charm | null = null;
    let hovered: Charm | null = null;
    const mouse = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      const dt = Math.max(8, now - last.t);
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      const vx = dx / dt;
      const vy = dy / dt;
      last = { x: e.clientX, y: e.clientY, t: now };
      if (grabbed) {
        // 抓住甩：拖动距离直接变成摆动速度
        grabbed.swing.vz += THREE.MathUtils.clamp(dx, -60, 60) * 0.0035;
        grabbed.swing.vx += THREE.MathUtils.clamp(dy, -60, 60) * 0.0025;
        grabbed.swing.vs += THREE.MathUtils.clamp(dx, -60, 60) * 0.003;
        swingRoot.vz += THREE.MathUtils.clamp(dx, -60, 60) * 0.0006;
        renderer.domElement.style.cursor = "grabbing";
        return;
      }
      const c = hitTest(e.clientX, e.clientY);
      hovered = c;
      renderer.domElement.style.cursor = c ? "grab" : "default";
      if (c) {
        c.swing.vz += THREE.MathUtils.clamp(vx, -3, 3) * 0.012;
        c.swing.vx += THREE.MathUtils.clamp(vy, -3, 3) * 0.008;
        c.swing.vs += THREE.MathUtils.clamp(vx, -3, 3) * 0.02;
        swingRoot.vz += THREE.MathUtils.clamp(vx, -3, 3) * 0.002;
      }
    };
    const onWinMove = (e: PointerEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
      grabbed = hitTest(e.clientX, e.clientY);
      if (grabbed) renderer.domElement.setPointerCapture(e.pointerId);
      grab.active = !!grabbed;
    };
    const onUp = (e: PointerEvent) => {
      const g = grabbed;
      grabbed = null;
      grab.active = false;
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 6) return;
      const c = g ?? hitTest(e.clientX, e.clientY);
      if (c?.id) pickRef.current(c.id);
      else if (c) {
        c.swing.vs += 0.35;
        c.swing.vz += 0.04;
      }
    };
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointercancel", onUp);
    window.addEventListener("pointermove", onWinMove);

    // 物理：阻尼摆
    const step = (s: Swing, k: number, damp: number) => {
      s.vz += (-(k * Math.sin(s.az - s.rest))) * 0.016;
      s.vx += -k * Math.sin(s.ax) * 0.016;
      s.vs += -s.spin * 0.02;
      s.vz *= damp;
      s.vx *= damp;
      s.vs *= 0.96;
      s.az += s.vz;
      s.ax += s.vx;
      s.spin += s.vs;
    };

    let raf = 0;
    let dropY = 0;
    let dropV = 0;
    let acc = 0;
    let lastT = performance.now();
    const t0 = performance.now();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visibleRef.current) {
        lastT = performance.now();
        return;
      }
      const t = (performance.now() - t0) / 1000;
      if (dropRef.current) {
        dropRef.current = false;
        dropY = 7.5;
        dropV = 0;
        swingRoot.vz += (Math.random() - 0.5) * 0.04;
        charms.forEach((c, i) => (c.swing.vz += (i % 2 ? -1 : 1) * 0.05));
      }
      // 物理按固定 60Hz 步进，帧率低的设备也一样快
      const now = performance.now();
      acc += Math.min(0.1, (now - lastT) / 1000);
      lastT = now;
      let steps = 0;
      while (acc >= 1 / 60 && steps < 8) {
        acc -= 1 / 60;
        steps++;
        // 掉下来：带回弹的弹簧
        dropV += -dropY * 0.055;
        dropV *= 0.84;
        dropY += dropV;
        // 一点点风
        swingRoot.vz += Math.sin(t * 0.7) * 0.00006;
        step(swingRoot, 0.35, 0.992);
        for (const c of charms) step(c.swing, 1.6, 0.985);
      }
      root.position.y = top + dropY;
      root.rotation.z = swingRoot.az;
      root.rotation.x = swingRoot.ax;
      for (const c of charms) {
        // 整串摆动时，挂件会被反向带一下
        c.pivot.rotation.z = c.swing.az - swingRoot.az * 0.6;
        c.pivot.rotation.x = c.swing.ax;
        c.pivot.rotation.y = c.swing.spin;
        const target = c === hovered || c === grabbed ? 1.07 : 1;
        c.body.scale.setScalar(THREE.MathUtils.lerp(c.body.scale.x, target, 0.15));
      }
      // 影子：跟着整串的摆动左右移，掉下来时由淡变浓
      shadow.position.x = Math.sin(swingRoot.az) * 7.2;
      shadow.scale.x = 1 + Math.abs(swingRoot.az) * 1.5;
      (shadow.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.clamp(1 - dropY / 5, 0, 1);
      // 镜头跟着鼠标轻轻绕
      cam.position.x += (mouse.x * 1.1 - cam.position.x) * 0.04;
      cam.position.y += (-0.2 - mouse.y * 0.6 - cam.position.y) * 0.04;
      cam.lookAt(0, -0.5, 0);
      renderer.render(scene, cam);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointercancel", onUp);
      window.removeEventListener("pointermove", onWinMove);
      shadowTex.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
      });
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [tags]);

  return <div ref={host} className="absolute inset-0" />;
}
