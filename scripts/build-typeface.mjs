// 把 Geist 字体转成 three.js 能用的 typeface JSON（只保留英文字母、数字和少量符号）。
// 用法：node scripts/build-typeface.mjs
import { readFileSync, writeFileSync } from "node:fs";
import opentype from "opentype.js";

const KEEP = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .-/";
const jobs = [["node_modules/geist/dist/fonts/geist-sans/Geist-Black.ttf", "public/fonts/geist-black.typeface.json"]];

for (const [src, out] of jobs) {
  const buf = readFileSync(src);
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const scale = 100000 / ((font.unitsPerEm || 2048) * 72);
  const r = Math.round;
  const glyphs = {};
  for (const ch of KEEP) {
    const g = font.charToGlyph(ch);
    const token = { ha: r(g.advanceWidth * scale), x_min: r((g.xMin ?? 0) * scale), x_max: r((g.xMax ?? 0) * scale), o: "" };
    for (const c of g.path.commands) {
      const type = c.type.toLowerCase() === "c" ? "b" : c.type.toLowerCase();
      token.o += type + " ";
      if (c.x !== undefined) token.o += r(c.x * scale) + " " + r(c.y * scale) + " ";
      if (c.x1 !== undefined) token.o += r(c.x1 * scale) + " " + r(c.y1 * scale) + " ";
      if (c.x2 !== undefined) token.o += r(c.x2 * scale) + " " + r(c.y2 * scale) + " ";
    }
    glyphs[ch] = token;
  }
  const json = {
    glyphs,
    familyName: font.getEnglishName("fullName"),
    ascender: r(font.ascender * scale),
    descender: r(font.descender * scale),
    underlinePosition: font.tables.post.underlinePosition,
    underlineThickness: font.tables.post.underlineThickness,
    boundingBox: { xMin: font.tables.head.xMin, xMax: font.tables.head.xMax, yMin: font.tables.head.yMin, yMax: font.tables.head.yMax },
    resolution: 1000,
    original_font_information: font.tables.name,
  };
  writeFileSync(out, JSON.stringify(json));
  console.log(out, (JSON.stringify(json).length / 1024).toFixed(1) + "KB");
}
