"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

/**
 * prompt 频道的背景：一片会飘的天空（着色器），前面悬着一块铬金属的 "prompt" 字。
 * 铬的反射来自一个蓝天渐变 + 几条灯带搭出来的环境，所以金属里反的是天空。
 */

const skyFrag = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i+vec2(1.,0.)), c = hash(i+vec2(0.,1.)), d = hash(i+vec2(1.,1.));
  vec2 u = f*f*(3.-2.*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.-u.x) + (d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float v = 0., a = .5;
  for(int i=0;i<6;i++){ v += a*noise(p); p = p*2.03 + vec2(17.3, 9.1); a *= .5; }
  return v;
}
void main(){
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y) + uMouse * 0.035;

  // 天空：上深下浅
  vec3 top = vec3(0.09, 0.24, 0.86);
  vec3 mid = vec3(0.36, 0.52, 0.95);
  vec3 low = vec3(0.80, 0.86, 0.97);
  vec3 col = mix(low, mid, smoothstep(0.0, 0.55, uv.y));
  col = mix(col, top, smoothstep(0.55, 1.05, uv.y));

  // 两层云，慢慢飘
  float t = uTime * 0.012;
  float c1 = fbm(p * 1.6 + vec2(t, t * 0.3));
  float c2 = fbm(p * 3.4 + vec2(-t * 1.6, t * 0.8) + c1);
  float cloud = smoothstep(0.48, 0.86, c1 * 0.65 + c2 * 0.45);
  cloud *= smoothstep(1.05, 0.15, uv.y) * 0.95 + 0.05;
  vec3 cloudCol = mix(vec3(0.93, 0.95, 1.0), vec3(0.70, 0.78, 0.95), c2);
  col = mix(col, cloudCol, cloud * 0.92);

  // 胶片颗粒
  col += (hash(uv * uRes + fract(uTime) * 91.7) - 0.5) * 0.035;
  gl_FragColor = vec4(col, 1.0);
}
`;

const quadVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }
`;

const envFrag = /* glsl */ `
varying vec3 vPos;
void main(){
  vec3 d = normalize(vPos);
  float h = d.y;
  vec3 c;
  if (h > 0.0) {
    // 天空：地平线附近很亮，往上迅速变成深蓝
    c = mix(vec3(2.4, 2.5, 2.7), vec3(0.55, 0.72, 1.6), smoothstep(0.0, 0.12, h));
    c = mix(c, vec3(0.04, 0.16, 0.85), smoothstep(0.12, 0.7, h));
  } else {
    // 地面：贴着地平线一道暗线，再往下是深蓝黑
    c = mix(vec3(0.0, 0.0, 0.03), vec3(0.42, 0.5, 0.78), smoothstep(-0.02, -0.35, h));
    c = mix(c, vec3(0.08, 0.12, 0.35), smoothstep(-0.35, -0.9, h));
  }
  // 几道横向的高光带
  c += vec3(3.0) * smoothstep(0.012, 0.0, abs(h - 0.32));
  c += vec3(1.6) * smoothstep(0.02, 0.0, abs(h + 0.18));
  gl_FragColor = vec4(c, 1.0);
}
`;
const envVert = /* glsl */ `
varying vec3 vPos;
void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

export function SkyChrome({ active, visible, word = "prompt" }: { active: boolean; visible: boolean; word?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(visible);
  const enterRef = useRef(false);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);
  // 每次切进来：镜头从远处推近，字转一整圈落定
  useEffect(() => {
    if (active) enterRef.current = true;
  }, [active]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.autoClear = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";

    // 天空
    const skyScene = new THREE.Scene();
    const skyCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader: quadVert,
      fragmentShader: skyFrag,
      uniforms: { uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uMouse: { value: new THREE.Vector2(0, 0) } },
      depthTest: false,
      depthWrite: false,
    });
    skyScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMat));

    // 铬金属反射的环境
    const envScene = new THREE.Scene();
    envScene.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(50, 48, 24),
        new THREE.ShaderMaterial({ vertexShader: envVert, fragmentShader: envFrag, side: THREE.BackSide }),
      ),
    );
    const strip = (x: number, y: number, z: number, w: number, h: number, ry: number) => {
      const lm = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      lm.color.setScalar(5);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lm);
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      m.rotateZ(ry);
      envScene.add(m);
    };
    strip(-12, 8, 18, 30, 2.2, 0.2);
    strip(16, -3, 14, 26, 1.4, -0.4);
    strip(0, 22, -6, 40, 3, 0);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(envScene, 0.02).texture;

    // 铬字
    const scene = new THREE.Scene();
    scene.environment = envTex;
    const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    cam.position.set(0, 0, 10);
    const group = new THREE.Group();
    scene.add(group);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.06, envMapIntensity: 1.15 });
    let mesh: THREE.Mesh | null = null;
    let textWidth = 4;
    new FontLoader().load("/fonts/geist-black.typeface.json", (font) => {
      const geo = new TextGeometry(word, {
        font,
        size: 1,
        depth: 0.34,
        curveSegments: 14,
        bevelEnabled: true,
        bevelThickness: 0.07,
        bevelSize: 0.04,
        bevelSegments: 8,
      });
      geo.center();
      geo.computeBoundingBox();
      const b = geo.boundingBox!;
      textWidth = b.max.x - b.min.x;
      mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);
      resize();
    });

    let camZ = 10;
    // 尺寸：让字宽占屏幕的一定比例
    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      skyMat.uniforms.uRes.value.set(w, h);
      cam.aspect = w / h;
      const share = w < 768 ? 0.86 : 0.56;
      const visibleW = textWidth / share;
      const dist = visibleW / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect);
      camZ = dist;
      cam.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // 鼠标让字轻轻转
    const target = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove);

    // 点一下铬字，它会转起来
    const ray = new THREE.Raycaster();
    let spinV = 0;
    const onDown = (e: PointerEvent) => {
      if (!mesh) return;
      const r = el.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cam);
      if (ray.intersectObject(mesh).length) spinV += 0.32;
    };
    el.parentElement?.addEventListener("pointerdown", onDown);

    let raf = 0;
    let enterStart = -1;
    let spin = 0;
    const timer = new THREE.Timer();
    let rx = 0;
    let ry = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visibleRef.current) return;
      timer.update();
      const t = timer.getElapsed();
      skyMat.uniforms.uTime.value = t;
      skyMat.uniforms.uMouse.value.x += (target.x - skyMat.uniforms.uMouse.value.x) * 0.03;
      skyMat.uniforms.uMouse.value.y += (-target.y - skyMat.uniforms.uMouse.value.y) * 0.03;
      if (enterRef.current) {
        enterRef.current = false;
        enterStart = t;
      }
      // 出场：0 → 1，缓出
      const k = enterStart < 0 ? 1 : Math.min(1, (t - enterStart - 0.35) / 1.9);
      const ek = k <= 0 ? 0 : 1 - Math.pow(1 - k, 4);
      cam.position.z = camZ * (1 + (1 - ek) * 2.6);
      spin += spinV;
      spinV *= 0.955;
      ry += (target.x * 0.45 + Math.sin(t * 0.35) * 0.22 - ry) * 0.05;
      rx += (-0.06 + target.y * 0.2 + Math.sin(t * 0.5) * 0.06 - rx) * 0.05;
      group.rotation.set(rx, ry + (1 - ek) * Math.PI * 2 + spin, Math.sin(t * 0.3) * 0.03);
      group.position.y = Math.sin(t * 0.8) * 0.05;
      renderer.clear();
      renderer.render(skyScene, skyCam);
      renderer.clearDepth();
      renderer.render(scene, cam);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      el.parentElement?.removeEventListener("pointerdown", onDown);
      mesh?.geometry.dispose();
      mat.dispose();
      skyMat.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [word]);

  return <div ref={host} className="absolute inset-0" aria-hidden />;
}
