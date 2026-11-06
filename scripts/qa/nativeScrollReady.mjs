export async function waitForScrollIdle(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    let x = scrollX, y = scrollY, stable = 0, frame, done = false;
    const finish = error => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      if (error) reject(error); else resolve();
    };
    const timer = setTimeout(() => finish(new Error('NATIVE_SCROLL_PREPARATION_UNSETTLED')), 3000);
    const sample = () => {
      const nextX = scrollX, nextY = scrollY;
      stable = nextX === x && nextY === y ? stable + 1 : 0;
      x = nextX; y = nextY;
      if (stable >= 8) finish(); else frame = requestAnimationFrame(sample);
    };
    frame = requestAnimationFrame(sample);
  }));
}
