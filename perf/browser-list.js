// Paste into the browser console on http://localhost:4173/ (production build,
// Mock controls latency 0). Results land in window.__perf when status is "done".
// Used for the before/after numbers in docs/performance.md.
window.__perf = { status: 'running' };
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const cards = () => document.querySelectorAll('.card').length;
  const loadMore = () =>
    [...document.querySelectorAll('button')].find((b) => b.textContent === 'Load more');
  const visibleAtStart = document.visibilityState;

  const clicks = [];
  const longTasks = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (e.name === 'click') clicks.push(Math.round(e.duration));
  }).observe({ type: 'event', durationThreshold: 16, buffered: false });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries())
      longTasks.push({ at: e.startTime, ms: Math.round(e.duration) });
  }).observe({ type: 'longtask', buffered: false });

  while (!document.querySelector('.card')) await sleep(50);
  window.scrollTo(0, 0);

  // 1) Load 3,000 products (49 x "Load more"), or scroll for infinite loading.
  const loadStart = performance.now();
  for (let i = 0; i < 400; i++) {
    const loaded = Number(
      document.querySelector('[data-total-loaded]')?.getAttribute('data-total-loaded') ?? cards(),
    );
    if (loaded >= 3000) break;
    const button = loadMore();
    if (button) button.click();
    else window.scrollTo(0, document.documentElement.scrollHeight);
    await sleep(150);
    window.__perf.progress = loaded;
  }
  const loadMs = Math.round(performance.now() - loadStart);
  await sleep(500);

  // 2) Live stock updates with 3,000 products loaded (ticker runs every 2 s).
  const liveStart = performance.now();
  await sleep(12000);
  const liveTasks = longTasks.filter((t) => t.at >= liveStart);

  const median = (xs) => {
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)] ?? 0;
  };
  window.__perf = {
    status: 'done',
    visibleAtStart,
    visibleAtEnd: document.visibilityState,
    productsLoaded: Number(
      document.querySelector('[data-total-loaded]')?.getAttribute('data-total-loaded') ?? cards(),
    ),
    cardsInDom: cards(),
    domNodes: document.getElementsByTagName('*').length,
    loadMs,
    slowClicks: clicks.length,
    clickMedianMs: median(clicks),
    clickMaxMs: Math.max(0, ...clicks),
    liveWindowMs: 12000,
    liveLongTasks: liveTasks.length,
    liveLongTaskMedianMs: median(liveTasks.map((t) => t.ms)),
    liveLongTaskMaxMs: Math.max(0, ...liveTasks.map((t) => t.ms)),
  };
})().catch((e) => {
  window.__perf = { status: 'error', message: String(e) };
});
