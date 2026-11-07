export const overlayScript = `
window.__name = window.__name || ((target) => target);
window.__autoloomOverlay = {
  cursor: null,
  ensure() {
    if (this.cursor) return;
    const cursor = document.createElement('div');
    cursor.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:26px;z-index:2147483647;pointer-events:none;transition:transform 700ms cubic-bezier(0.16,1,0.3,1);transform:translate(640px,420px)';
    cursor.innerHTML = '<svg width="22" height="26" viewBox="0 0 18 22"><path d="M1 1l15 11.5-6.6.9 3.9 7.6-2.7 1.3-3.8-7.7L1 19z" fill="#18181b" stroke="white" stroke-width="1.5"/></svg>';
    document.documentElement.appendChild(cursor);
    this.cursor = cursor;
  },
  moveTo(x, y) { this.ensure(); this.cursor.style.transform = 'translate(' + x + 'px,' + y + 'px)'; },
  ring(box) {
    const ring = document.createElement('div');
    ring.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;border:3px solid #2dd4bf;border-radius:12px;box-shadow:0 0 0 6px rgba(45,212,191,0.25);transition:opacity 300ms;left:' + (box.x - 6) + 'px;top:' + (box.y - 6) + 'px;width:' + (box.width + 12) + 'px;height:' + (box.height + 12) + 'px';
    document.documentElement.appendChild(ring);
    setTimeout(() => { ring.style.opacity = '0'; setTimeout(() => ring.remove(), 300); }, 1200);
  }
};`;
