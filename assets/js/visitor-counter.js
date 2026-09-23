/*
 * Visitor counter for a static site.
 *
 * Uses Abacus (https://abacus.jasoncameron.dev): free, no signup, CORS "*".
 *   GET {API_BASE}/hit/{ns}/{key} -> {"value": N}  (increments; creates key if missing)
 *   GET {API_BASE}/get/{ns}/{key} -> {"value": N}  (read only; 404 {"error":"Key not found"} if never hit)
 *
 * Each browser increments at most once per 24h; otherwise it only reads.
 * Local/dev pages (localhost, 127.0.0.1, file://) never increment.
 * If the API fails, the last known count is shown; if there is none, the bar is hidden.
 */
(function () {
  'use strict';

  // ---- Config ------------------------------------------------------------
  var API_BASE = 'https://abacus.jasoncameron.dev';
  var NAMESPACE = 'nashra-flour-mill';
  var KEY = 'visits';
  var TIMEOUT_MS = 6000;
  var HIT_INTERVAL_MS = 24 * 60 * 60 * 1000;
  var ANIMATION_MS = 1200;
  // -------------------------------------------------------------------------

  var STORE_LAST_HIT = 'nfm:visitor:lastHit';
  var STORE_COUNT = 'nfm:visitor:count';

  function storeGet(name) {
    try { return window.localStorage.getItem(name); } catch (e) { return null; }
  }

  function storeSet(name, value) {
    try { window.localStorage.setItem(name, String(value)); } catch (e) { /* ignore */ }
  }

  function isLocal() {
    var loc = window.location;
    var host = loc.hostname;
    return loc.protocol === 'file:' ||
      host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]' || host === '';
  }

  function shouldHit() {
    if (isLocal()) return false;
    var last = parseInt(storeGet(STORE_LAST_HIT), 10);
    return !(last > 0 && Date.now() - last < HIT_INTERVAL_MS);
  }

  function format(n) {
    return Math.round(n).toLocaleString('en-IN');
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function render(el, from, to) {
    if (prefersReducedMotion() || typeof window.requestAnimationFrame !== 'function' || from >= to) {
      el.textContent = format(to);
      return;
    }
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / ANIMATION_MS, 1);
      var eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      el.textContent = format(from + (to - from) * eased);
      if (t < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  function request(action) {
    var url = API_BASE + '/' + action + '/' +
      encodeURIComponent(NAMESPACE) + '/' + encodeURIComponent(KEY);
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, TIMEOUT_MS);

    return fetch(url, { signal: controller ? controller.signal : undefined, cache: 'no-store' })
      .then(function (res) {
        // A "get" on a key that has never been hit returns 404: the count is 0.
        if (res.status === 404 && action === 'get') return { value: 0 };
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var value = data && Number(data.value);
        if (!isFinite(value) || value < 0) throw new Error('Bad response');
        return value;
      })
      .finally(function () { clearTimeout(timer); });
  }

  function init() {
    var countEl = document.getElementById('visitorCount');
    if (!countEl) return;
    var barEl = document.getElementById('visitorBar');

    var cached = parseInt(storeGet(STORE_COUNT), 10);
    var hasCached = isFinite(cached) && cached >= 0;
    var hit = shouldHit();

    // Promise.prototype.finally / fetch missing (very old browsers): fall back quietly.
    if (typeof fetch !== 'function' || typeof Promise.prototype.finally !== 'function') {
      fallback();
      return;
    }

    request(hit ? 'hit' : 'get')
      .then(function (value) {
        if (hit) storeSet(STORE_LAST_HIT, Date.now());
        storeSet(STORE_COUNT, value);
        if (barEl) barEl.hidden = false;
        render(countEl, hasCached && cached <= value ? cached : 0, value);
      })
      .catch(fallback);

    function fallback() {
      if (hasCached) {
        countEl.textContent = format(cached);
      } else if (barEl) {
        barEl.hidden = true;
      } else {
        countEl.hidden = true;
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
