/**
 * 换屏手势。
 *
 * 触控板的一次轻扫会连续发出几十个 wheel 事件（约 16ms 一个），
 * 松手后还有一长串惯性尾巴。这里把「一次扫动」只算成一次换屏：
 * 累计到阈值就换，然后等手势停下（安静 180ms）或者明显开始新的一扫（力度突然变大）才重新接受。
 * 鼠标滚轮一格一格的事件同样适用。
 */
export function createWheelGate(threshold = 40) {
  let acc = 0;
  let last = -Infinity;
  let prevAbs = 0;
  let armed = true;
  return (deltaY: number, now: number, lockUntil: number): -1 | 0 | 1 => {
    const gap = now - last;
    last = now;
    const abs = Math.abs(deltaY);
    if (gap > 180) {
      armed = true;
      acc = 0;
    } else if (!armed && now >= lockUntil && abs > 10 && abs > prevAbs * 1.6) {
      // 惯性尾巴里又扫了一下
      armed = true;
      acc = 0;
    }
    prevAbs = abs;
    if (!armed || now < lockUntil) return 0;
    acc += deltaY;
    if (Math.abs(acc) >= threshold) {
      const dir = acc > 0 ? 1 : -1;
      armed = false;
      acc = 0;
      return dir;
    }
    return 0;
  };
}

/** 正在拖拽屏幕里的东西（钥匙扣、工作台节点）时，触摸滑动不换屏 */
export const grab = { active: false };
