#!/usr/bin/env node
// 一键命令：otato art dev
// 安装一次：在项目目录运行 npm link，之后在任何目录都能用 otato art dev。
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// 以后有别的项目，在这里加一行
const projects = { art: root };
const commands = { dev: "dev", build: "build", start: "start", check: "check", publish: "publish:workbench" };

const [project, cmd = "dev"] = process.argv.slice(2);
const cwd = projects[project];
if (!cwd || !commands[cmd]) {
  console.log("用法：otato art dev | build | start | check（推送前检查） | publish（更新开场工作台素材）");
  process.exit(1);
}

const run = (args) =>
  new Promise((resolve, reject) => {
    const p = spawn("npm", args, { cwd, stdio: "inherit" });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(code)));
  });

// 依赖没装、依赖有变化、或者是在别的系统上装的（比如 Linux），先装一次本机版本
const marker = join(cwd, "node_modules", ".otato-platform");
const lock = join(cwd, "package-lock.json");
const lockHash = existsSync(lock) ? createHash("sha1").update(readFileSync(lock)).digest("hex").slice(0, 12) : "none";
const want = `${process.platform}-${process.arch}-${lockHash}`;
const have = existsSync(marker) ? readFileSync(marker, "utf8").trim() : "";

try {
  if (have !== want) {
    console.log("正在安装依赖…");
    await run(["install", "--no-audit", "--no-fund"]);
    writeFileSync(marker, want);
  }
  await run(["run", commands[cmd]]);
} catch (code) {
  process.exit(typeof code === "number" ? code : 1);
}
