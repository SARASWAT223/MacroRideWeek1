/**
 * ui.js – Macro Rides UI Controller
 * ─────────────────────────────────────────────────────────────
 * Manages:
 *  • Status bar updates
 *  • Stat card counters
 *  • Layer toggle bindings
 *  • Driver toast notifications
 *  • Speed slider
 *  • Route preset button states
 */

/**
 * Update the header status indicator.
 *
 * @param {'idle'|'active'|'init'} state
 * @param {string} label
 */
export function setStatus(state, label) {
  const dot   = document.getElementById('status-dot');
  const lbl   = document.getElementById('status-label');
  if (!dot || !lbl) return;

  dot.className = `status-dot ${state === 'active' ? 'active' : state === 'idle' ? 'idle' : ''}`;
  lbl.textContent = label;
}

/**
 * Update eligible and total pickup count stats.
 *
 * @param {number} eligible
 * @param {number} total
 */
export function updatePickupStats(eligible, total) {
  const eligEl  = document.getElementById('eligible-count');
  const totalEl = document.getElementById('total-count');
  if (eligEl)  animateCounter(eligEl, parseInt(eligEl.textContent || '0', 10), eligible);
  if (totalEl) totalEl.textContent = total;
}

/**
 * Update H3 cell count in the stat card.
 *
 * @param {number} count
 */
export function updateH3Count(count) {
  const el = document.getElementById('h3-count');
  if (el) animateCounter(el, parseInt(el.textContent || '0', 10), count);
}

/**
 * Animate a numeric counter from `from` to `to`.
 *
 * @param {HTMLElement} el
 * @param {number} from
 * @param {number} to
 */
function animateCounter(el, from, to) {
  if (from === to) return;
  const duration = 400;
  const start = performance.now();
  const diff = to - from;

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(from + diff * ease);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/**
 * Show or hide the driver toast notification.
 *
 * @param {boolean} visible
 * @param {string} title
 * @param {string} subtitle
 */
export function setDriverToast(visible, title = 'Driver EN-042', subtitle = 'Route Active') {
  const toast    = document.getElementById('driver-toast');
  const titleEl  = document.getElementById('toast-title');
  const subtitleEl = document.getElementById('toast-subtitle');
  if (!toast) return;

  if (titleEl)    titleEl.textContent    = title;
  if (subtitleEl) subtitleEl.textContent = subtitle;

  toast.classList.toggle('visible', visible);
}

/**
 * Bind all layer toggle checkboxes to callback.
 *
 * @param {function({ zone:boolean, corridor:boolean, h3:boolean, pickups:boolean }):void} onChange
 */
export function bindLayerToggles(onChange) {
  const ids = ['toggle-zone', 'toggle-corridor', 'toggle-h3', 'toggle-pickups'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => {
      onChange(getLayerStates());
    });
  });
}

/**
 * Get current toggle states.
 *
 * @returns {{ zone:boolean, corridor:boolean, h3:boolean, pickups:boolean }}
 */
export function getLayerStates() {
  return {
    zone:     document.getElementById('toggle-zone')?.checked     ?? true,
    corridor: document.getElementById('toggle-corridor')?.checked ?? true,
    h3:       document.getElementById('toggle-h3')?.checked       ?? false,
    pickups:  document.getElementById('toggle-pickups')?.checked  ?? true,
  };
}

/**
 * Bind speed slider to callback.
 *
 * @param {function(number):void} onChange
 */
export function bindSpeedSlider(onChange) {
  const slider = document.getElementById('speed-slider');
  const valEl  = document.getElementById('speed-val');
  if (!slider) return;

  slider.addEventListener('input', () => {
    const v = parseInt(slider.value, 10);
    if (valEl) valEl.textContent = `${v}×`;
    onChange(v);
  });
}

/**
 * Highlight the active route preset button.
 *
 * @param {string} routeId – 'route1' | 'route2' | 'route3'
 */
export function setActiveRouteButton(routeId) {
  const map = { route1: 'btn-route-1', route2: 'btn-route-2', route3: 'btn-route-3' };
  Object.values(map).forEach(id => {
    document.getElementById(id)?.classList.remove('active');
  });
  if (map[routeId]) {
    document.getElementById(map[routeId])?.classList.add('active');
  }
}

/**
 * Flash the eligible-count card to draw attention on update.
 */
export function flashEligibleCard() {
  const card = document.getElementById('stat-eligible');
  if (!card) return;
  card.style.borderColor = 'rgba(0,229,160,0.6)';
  card.style.background  = 'rgba(0,229,160,0.08)';
  setTimeout(() => {
    card.style.borderColor = '';
    card.style.background  = '';
  }, 600);
}
