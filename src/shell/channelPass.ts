import * as THREE from "three";

/** Print a two-colour enamel pass on the existing glTF card's UVs. */
export function channelPass(tools: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 268;
  const c = canvas.getContext("2d")!;
  const ink = tools ? "#253f99" : "#4b365c";
  const paper = tools ? "#ffdc9d" : "#dfd2ed";
  c.fillStyle = paper;
  c.fillRect(0, 0, 192, 268);
  c.fillStyle = ink;
  c.fillRect(10, 10, 172, 248);
  c.fillStyle = paper;
  c.font = "bold 18px monospace";
  c.fillText("oTATo / CH", 21, 36);
  c.fillRect(20, 45, 152, 2);
  c.font = "900 105px Helvetica, Arial, sans-serif";
  c.fillText(tools ? "04" : "05", 16, 145);
  if (tools) {
    c.fillRect(50, 172, 92, 43);
    c.strokeStyle = paper; c.lineWidth = 6;
    c.strokeRect(79, 162, 34, 15);
    c.fillStyle = ink; c.fillRect(50, 186, 92, 3);
  } else {
    c.fillRect(48, 166, 40, 10); c.fillRect(48, 173, 96, 43);
    c.fillStyle = ink; c.fillRect(55, 180, 82, 3);
  }
  c.fillStyle = paper; c.font = "bold 18px monospace";
  c.fillText(tools ? "TOOL SUPPLY" : "SKILL FILES", 21, 244);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.flipY = false;
  return new THREE.MeshStandardMaterial({ map, roughness: .6, side: THREE.DoubleSide });
}
