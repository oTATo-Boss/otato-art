"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * 雕版线条：把照片按明暗转成一条条横向刻线（暗处线粗、亮处线细）。
 * 鼠标所在处像暗房显影一样，还原出真实照片。几张照片之间用噪点溶解切换。
 */

const vert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }
`;

const frag = /* glsl */ `
precision highp float;
uniform sampler2D uA;
uniform sampler2D uB;
uniform float uAspA;
uniform float uAspB;
uniform float uBoxAsp;
uniform float uMix;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform float uLight;
uniform float uTime;
uniform vec3 uInk;
uniform vec3 uBg;
uniform vec3 uRose;
uniform float uDraw;
uniform float uFlash;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
// 等比裁切（cover）
vec2 cover(vec2 uv, float imgAsp){
  vec2 s = vec2(1.0);
  if (uBoxAsp > imgAsp) s.y = imgAsp / uBoxAsp; else s.x = uBoxAsp / imgAsp;
  return (uv - 0.5) * s + 0.5;
}
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

void main(){
  vec2 uv = vUv;
  vec3 a = texture2D(uA, cover(uv, uAspA)).rgb;
  vec3 b = texture2D(uB, cover(uv, uAspB)).rgb;
  float n = noise(uv * vec2(6.0, 11.0) + 3.0);
  float t = smoothstep(uMix - 0.08, uMix + 0.08, n);
  vec3 photo = mix(b, a, t);

  // 提一点对比，让线条更有雕版味
  float l = clamp((lum(photo) - 0.06) * 1.35, 0.0, 1.0);
  l = pow(l, 0.85);

  // 刻线：沿明暗起伏的横线
  float lines = uRes.y / 4.2;
  float bend = (noise(uv * vec2(3.0, 7.0)) - 0.5) * 0.9 + l * 1.4;
  float v = fract(uv.y * lines + bend);
  float thick = clamp(1.0 - l, 0.04, 0.92);
  float d = abs(v - 0.5) * 2.0;
  float aa = 1.6 / 4.2;
  float ink = 1.0 - smoothstep(thick - aa * 0.5, thick + aa * 0.5, d);
  // 纸面的细小颗粒
  ink *= 0.88 + 0.12 * hash(floor(uv * uRes));
  // 出场：刻线从上往下一行行刻出来
  float row = 1.0 - uv.y;
  float drawn = step(row + noise(vec2(uv.y * lines * 0.5, 7.0)) * 0.12, uDraw * 1.14);
  ink *= drawn;
  vec3 col = mix(uBg, uInk, ink);
  // 刻刀的位置有一道亮线
  col += uRose * 0.8 * (1.0 - smoothstep(0.0, 0.012, abs(row - uDraw * 1.14 + 0.06))) * step(uDraw, 0.99);

  // 暗房显影
  vec2 px = uv * uRes;
  float r = uLight;
  float m = (1.0 - smoothstep(r * 0.45, r, distance(px, uMouse))) * step(0.98, uDraw);
  vec3 dev = mix(photo, photo * vec3(1.0, 0.55, 0.55) + uRose * 0.12, 0.35);
  col = mix(col, dev, m);
  col += uRose * 0.18 * (1.0 - smoothstep(0.0, r * 1.6, distance(px, uMouse))) * uDraw;
  // 点击：闪光灯，整张照片短暂显影
  col = mix(col, photo, uFlash * 0.85) + vec3(uFlash * 0.25);

  gl_FragColor = vec4(col, 1.0);
}
`;

// 着色器里直接用设计稿的 sRGB 数值，不经过色彩空间换算
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

export function Engraving({
  photos,
  index,
  flash,
  active,
  visible,
}: {
  photos: string[];
  /** 当前显示第几张；变化时溶解过去 */
  index: number;
  /** 每加 1 闪一次光 */
  flash: number;
  active: boolean;
  visible: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(visible);
  const indexRef = useRef(index);
  const flashRef = useRef(flash);
  const enterRef = useRef(false);
  useEffect(() => {
    visibleRef.current = visible;
    indexRef.current = index;
    flashRef.current = flash;
  }, [visible, index, flash]);
  useEffect(() => {
    if (active) enterRef.current = true;
  }, [active]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const loader = new THREE.TextureLoader();
    const textures: THREE.Texture[] = photos.map((src) => {
      const tex = loader.load(src, () => (needAsp = true));
      tex.colorSpace = THREE.NoColorSpace;
      tex.minFilter = THREE.LinearFilter;
      return tex;
    });
    let needAsp = true;
    const asp = (t: THREE.Texture) => {
      const img = t.image as HTMLImageElement | undefined;
      return img && img.width ? img.width / img.height : 0.56;
    };

    const u = {
      uA: { value: textures[0] },
      uB: { value: textures[0] },
      uAspA: { value: 0.56 },
      uAspB: { value: 0.56 },
      uBoxAsp: { value: 0.6 },
      uMix: { value: 1.15 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: new THREE.Vector2(-999, -999) },
      uLight: { value: 120 },
      uTime: { value: 0 },
      uInk: { value: rgb("#D9B798") },
      uBg: { value: rgb("#17110F") },
      uRose: { value: rgb("#E11D48") },
      uDraw: { value: 1 },
      uFlash: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: u });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      u.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
      u.uBoxAsp.value = w / h;
      u.uLight.value = Math.max(70, w * 0.32) * renderer.getPixelRatio();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let lastMove = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      const pr = renderer.getPixelRatio();
      lastMove = performance.now();
      u.uMouse.value.set((e.clientX - r.left) * pr, (r.bottom - e.clientY) * pr);
    };
    window.addEventListener("pointermove", onMove);

    let raf = 0;
    let shown = 0;
    let fadeStart = -1;
    let drawStart = -1;
    let lastFlash = flashRef.current;
    const FADE = 1100;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visibleRef.current) return;
      if (needAsp) {
        u.uAspA.value = asp(u.uA.value);
        u.uAspB.value = asp(u.uB.value);
        needAsp = false;
      }
      // 出场：刻线从 0 刻到 1
      if (enterRef.current) {
        enterRef.current = false;
        drawStart = now;
      }
      u.uDraw.value = drawStart < 0 ? 1 : Math.min(1, Math.max(0, (now - drawStart - 300) / 1700));
      // 换照片：溶解到目标那张
      const want = indexRef.current % textures.length;
      if (want !== shown && fadeStart < 0) {
        u.uB.value = textures[want];
        needAsp = true;
        fadeStart = now;
      }
      if (fadeStart >= 0) {
        const p = Math.min(1, (now - fadeStart) / FADE);
        u.uMix.value = 1.15 - p * 1.3;
        if (p >= 1) {
          shown = textures.indexOf(u.uB.value);
          u.uA.value = u.uB.value;
          u.uMix.value = 1.15;
          needAsp = true;
          fadeStart = -1;
        }
      } else {
        u.uMix.value = 1.15;
      }
      // 闪光
      if (flashRef.current !== lastFlash) {
        lastFlash = flashRef.current;
        u.uFlash.value = 1;
      }
      u.uFlash.value *= 0.9;
      // 鼠标不动时，光自己巡游
      if (now - lastMove > 2500) {
        const t = now / 1000;
        u.uMouse.value.set(u.uRes.value.x * (0.5 + 0.28 * Math.sin(t * 0.5)), u.uRes.value.y * (0.55 + 0.25 * Math.sin(t * 0.37 + 1)));
      }
      u.uTime.value = now / 1000;
      renderer.render(scene, cam);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      textures.forEach((t) => t.dispose());
      mat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [photos]);

  return <div ref={host} className="absolute inset-0" aria-hidden />;
}
