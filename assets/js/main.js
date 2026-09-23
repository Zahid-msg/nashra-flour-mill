(function () {
  'use strict';

  var WHATSAPP = '919633490083';
  var TZ = 'Asia/Kolkata';
  var OPEN = { days: [1, 2, 3, 4, 5, 6], from: 9 * 60, to: 18 * 60 + 15 };
  var ORDER_KEY = 'nfm:order';
  var THEME_KEY = 'nfm:theme';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function store(key, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem(key));
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { return null; }
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function rupees(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }

  function waLink(text) { return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(text); }

  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  /* ---------- Theme ---------- */
  function initTheme() {
    var root = document.documentElement;
    $('#themeToggle').addEventListener('click', function () {
      var dark = root.dataset.theme
        ? root.dataset.theme === 'dark'
        : window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.dataset.theme = dark ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, root.dataset.theme); } catch (e) {}
    });
  }

  /* ---------- Navigation ---------- */
  function initNav() {
    var navbar = $('#navbar');
    var burger = $('#burger');
    var links = $('#navLinks');
    var topBtn = $('#scrollTop');

    function onScroll() {
      var y = window.scrollY;
      navbar.classList.toggle('scrolled', y > 40);
      topBtn.classList.toggle('visible', y > 700);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    function setMenu(open) {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      links.classList.toggle('open', open);
      if (open) navbar.classList.add('scrolled'); else onScroll();
    }
    burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
    links.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

    topBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }); });

    // Highlight the section currently in view.
    var navMap = {};
    $$('a', links).forEach(function (a) { navMap[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var a = navMap[entry.target.id];
        if (a && entry.isIntersecting) {
          $$('a', links).forEach(function (x) { x.classList.remove('active'); });
          a.classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(navMap).forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ---------- Reveal + count-up ---------- */
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  function observeReveals(root) { $$('.reveal:not(.in)', root).forEach(function (n) { revealObserver.observe(n); }); }

  function countUp(node) {
    var target = parseInt(node.dataset.count, 10);
    var sup = node.querySelector('sup');
    var suffix = sup ? sup.outerHTML : '';
    if (reducedMotion) { node.innerHTML = target.toLocaleString('en-IN') + suffix; return; }
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / 1600, 1);
      var v = Math.round(target * (1 - Math.pow(1 - t, 3)));
      node.innerHTML = v.toLocaleString('en-IN') + suffix;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function initStats() {
    var stats = $('#stats');
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        $$('[data-count]', stats).forEach(countUp);
        io.disconnect();
      }
    }, { threshold: 0.4 });
    io.observe(stats);
  }

  /* ---------- Open / closed status (India time) ---------- */
  function istNow() {
    var parts = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date())
      .forEach(function (p) { parts[p.type] = p.value; });
    var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
    return { day: day, minutes: parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10) };
  }

  function fmtTime(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    return ((h + 11) % 12 + 1) + (m ? ':' + String(m).padStart(2, '0') : '') + (h < 12 ? ' AM' : ' PM');
  }

  function updateOpenStatus() {
    var now = istNow();
    var box = $('#openStatus');
    var text = $('#openStatusText');
    var openDay = OPEN.days.indexOf(now.day) !== -1;
    var isOpen = openDay && now.minutes >= OPEN.from && now.minutes < OPEN.to;
    box.classList.toggle('is-open', isOpen);
    box.classList.toggle('is-closed', !isOpen);

    if (isOpen) {
      text.innerHTML = '<strong>Open now</strong> · until ' + fmtTime(OPEN.to);
    } else {
      var opensToday = openDay && now.minutes < OPEN.from;
      var next = opensToday ? 'today' : null;
      if (!next) {
        for (var i = 1; i <= 7; i++) {
          var d = (now.day + i) % 7;
          if (OPEN.days.indexOf(d) !== -1) { next = i === 1 ? 'tomorrow' : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]; break; }
        }
      }
      text.innerHTML = '<strong>Closed</strong> · opens ' + next + ' ' + fmtTime(OPEN.from);
    }

    $$('#hoursTable tr').forEach(function (tr) {
      tr.classList.toggle('today', tr.dataset.days.split(',').indexOf(String(now.day)) !== -1);
    });
  }

  /* ---------- Products ---------- */
  var products = [];
  var byId = {};
  var order = store(ORDER_KEY) || {};
  var activeCategory = 'all';
  var query = '';

  function stepFor(p) { return p.category === 'spices' ? 0.25 : 1; }

  function fmtQty(qty, unit) {
    if (unit === 'kg' && qty < 1) return Math.round(qty * 1000) + ' g';
    if (unit === 'ltr' && qty < 1) return Math.round(qty * 1000) + ' ml';
    return (Math.round(qty * 100) / 100) + ' ' + unit;
  }

  function renderProducts() {
    var grid = $('#productGrid');
    grid.innerHTML = '';
    var q = query.trim().toLowerCase();
    var shown = products.filter(function (p) {
      var catOk = activeCategory === 'all' || p.category === activeCategory;
      var qOk = !q || (p.name + ' ' + p.description + ' ' + p.category).toLowerCase().indexOf(q) !== -1;
      return catOk && qOk;
    });

    if (!shown.length) {
      grid.appendChild(el('div', { class: 'empty-state' }, [
        el('i', { class: 'fas fa-magnifying-glass', 'aria-hidden': 'true' }),
        el('p', { text: 'No products match “' + query + '”. Try another word, or ask us on WhatsApp.' })
      ]));
      return;
    }

    shown.forEach(function (p, i) {
      var media = el('div', { class: 'product-media' }, [
        el('img', { src: p.image, alt: p.name, loading: 'lazy', decoding: 'async', width: '800', height: '600' }),
        el('span', { class: 'product-tag', text: p.badge })
      ]);
      var action = el('div', { class: 'product-action', 'data-id': p.id });
      var body = el('div', { class: 'product-body' }, [
        el('h3', { text: p.name }),
        el('p', { text: p.description }),
        el('div', { class: 'product-foot' }, [
          el('div', { class: 'price', html: rupees(p.price) + '<small>/' + p.unit + '</small>' }),
          action
        ])
      ]);
      var card = el('article', { class: 'product-card reveal', style: '--d:' + Math.min(i % 4, 3) * 0.06 + 's' }, [media, body]);
      renderAction(action, p);
      grid.appendChild(card);
    });
    observeReveals(grid);
  }

  function renderAction(container, p) {
    container.innerHTML = '';
    var qty = order[p.id] || 0;
    if (!qty) {
      container.appendChild(el('button', { class: 'add-btn', type: 'button', 'data-act': 'add', 'aria-label': 'Add ' + p.name + ' to order', html: '<i class="fas fa-plus" aria-hidden="true"></i> Add' }));
    } else {
      container.appendChild(el('div', { class: 'stepper', role: 'group', 'aria-label': p.name + ' quantity' }, [
        el('button', { type: 'button', 'data-act': 'dec', 'aria-label': 'Less ' + p.name, html: '<i class="fas fa-minus" aria-hidden="true"></i>' }),
        el('output', { text: fmtQty(qty, p.unit) }),
        el('button', { type: 'button', 'data-act': 'inc', 'aria-label': 'More ' + p.name, html: '<i class="fas fa-plus" aria-hidden="true"></i>' })
      ]));
    }
  }

  function setQty(id, qty) {
    var p = byId[id];
    if (!p) return;
    qty = Math.max(0, Math.round(qty * 100) / 100);
    if (qty) order[id] = qty; else delete order[id];
    store(ORDER_KEY, order);
    $$('.product-action[data-id="' + id + '"]').forEach(function (c) { renderAction(c, p); });
    renderOrder();
  }

  function updateCounts() {
    $$('#filters .chip').forEach(function (chip) {
      var cat = chip.dataset.category;
      var n = products.filter(function (p) { return cat === 'all' || p.category === cat; }).length;
      chip.querySelector('.count').textContent = n;
    });
  }

  function setCategory(cat) {
    activeCategory = cat;
    $$('#filters .chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.category === cat)); });
    renderProducts();
  }

  function initProducts() {
    $('#filters').addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (chip) setCategory(chip.dataset.category);
    });
    $$('[data-filter-link]').forEach(function (a) {
      a.addEventListener('click', function () { setCategory(a.dataset.filterLink); });
    });

    var searchTimer;
    $('#productSearch').addEventListener('input', function (e) {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { query = e.target.value; renderProducts(); }, 120);
    });

    $('#productGrid').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var id = btn.closest('.product-action').dataset.id;
      var p = byId[id];
      var cur = order[id] || 0;
      var step = stepFor(p);
      if (btn.dataset.act === 'add') { setQty(id, step); toast(p.name + ' added to your order'); }
      if (btn.dataset.act === 'inc') setQty(id, cur + step);
      if (btn.dataset.act === 'dec') setQty(id, cur - step);
    });

    fetch('prices.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        products = Object.keys(data.products).map(function (id) {
          var p = data.products[id];
          p.id = id;
          byId[id] = p;
          return p;
        });
        Object.keys(order).forEach(function (id) { if (!byId[id]) delete order[id]; });

        var stat = $('#productCountStat');
        if (stat) stat.dataset.count = products.length;

        var select = $('#product');
        products.forEach(function (p) {
          select.appendChild(el('option', { value: p.name, text: p.name + ' — ' + rupees(p.price) + '/' + p.unit }));
        });
        select.appendChild(el('option', { value: 'Other', text: 'Other (tell us in the message)' }));

        updateCounts();
        renderProducts();
        renderOrder();
      })
      .catch(function () {
        $('#productGrid').innerHTML = '';
        $('#productGrid').appendChild(el('div', { class: 'empty-state' }, [
          el('i', { class: 'fas fa-wifi', 'aria-hidden': 'true' }),
          el('p', { html: 'Could not load the product list. Please refresh, or <a href="' + waLink('Hi, can you share your price list?') + '" target="_blank" rel="noopener">ask us for prices on WhatsApp</a>.' })
        ]));
      });
  }

  /* ---------- Order drawer ---------- */
  function orderLines() {
    return Object.keys(order).filter(function (id) { return byId[id]; }).map(function (id) {
      var p = byId[id];
      return { p: p, qty: order[id], total: p.price * order[id] };
    });
  }

  function renderOrder() {
    var lines = orderLines();
    var fab = $('#orderFab');
    var count = $('#orderCount');
    var prev = parseInt(count.textContent, 10) || 0;
    count.textContent = lines.length;
    fab.hidden = !lines.length;
    if (lines.length && lines.length !== prev) {
      fab.classList.remove('bump');
      void fab.offsetWidth;
      fab.classList.add('bump');
    }

    var body = $('#drawerItems');
    body.innerHTML = '';
    if (!lines.length) {
      body.appendChild(el('div', { class: 'empty-state' }, [
        el('i', { class: 'fas fa-basket-shopping', 'aria-hidden': 'true' }),
        el('p', { text: 'Your order is empty. Add products to get started.' })
      ]));
    }
    lines.forEach(function (l) {
      var action = el('div', { class: 'product-action', 'data-id': l.p.id });
      renderAction(action, l.p);
      body.appendChild(el('div', { class: 'line-item' }, [
        el('img', { src: l.p.image, alt: '', loading: 'lazy' }),
        el('div', {}, [el('h3', { text: l.p.name }), el('p', { text: rupees(l.p.price) + '/' + l.p.unit + ' · ' + rupees(l.total) })]),
        action
      ]));
    });

    var total = lines.reduce(function (s, l) { return s + l.total; }, 0);
    $('#orderTotal').textContent = rupees(total);
    $('#sendOrder').disabled = !lines.length;
  }

  function initOrder() {
    var drawer = $('#orderDrawer');
    var backdrop = $('#drawerBackdrop');
    var lastFocus;

    function open() {
      lastFocus = document.activeElement;
      drawer.hidden = false;
      backdrop.hidden = false;
      requestAnimationFrame(function () { drawer.classList.add('open'); backdrop.classList.add('open'); });
      document.body.style.overflow = 'hidden';
      $('#drawerClose').focus();
    }
    function close() {
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
      document.body.style.overflow = '';
      setTimeout(function () { drawer.hidden = true; backdrop.hidden = true; }, reducedMotion ? 0 : 400);
      if (lastFocus) lastFocus.focus();
    }

    $('#orderFab').addEventListener('click', open);
    $('#drawerClose').addEventListener('click', close);
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) close(); });

    $('#drawerItems').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var id = btn.closest('.product-action').dataset.id;
      var p = byId[id];
      var cur = order[id] || 0;
      if (btn.dataset.act === 'inc') setQty(id, cur + stepFor(p));
      if (btn.dataset.act === 'dec') setQty(id, cur - stepFor(p));
      if (!orderLines().length) close();
    });

    $('#clearOrder').addEventListener('click', function () {
      Object.keys(order).forEach(function (id) { delete order[id]; });
      store(ORDER_KEY, order);
      $$('#productGrid .product-action').forEach(function (c) { renderAction(c, byId[c.dataset.id]); });
      renderOrder();
      close();
    });

    $('#sendOrder').addEventListener('click', function () {
      var lines = orderLines();
      if (!lines.length) return;
      var name = $('#orderName').value.trim();
      var total = lines.reduce(function (s, l) { return s + l.total; }, 0);
      var msg = 'Hi Nashra Flour Mill' + (name ? ", I'm " + name : '') + '. I would like to order:\n\n' +
        lines.map(function (l) { return '• ' + l.p.name + ' — ' + fmtQty(l.qty, l.p.unit) + ' (' + rupees(l.total) + ')'; }).join('\n') +
        '\n\nEstimated total: ' + rupees(total) + '\nPlease confirm availability. Thank you!';
      window.open(waLink(msg), '_blank', 'noopener');
    });
  }

  /* ---------- Quick order form ---------- */
  function initForm() {
    var form = $('#orderForm');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var v = function (id) { return $('#' + id).value.trim(); };
      var msg = "Hi, I'm " + v('name') + '.\n' +
        "I'd like to order " + v('quantity') + ' kg/ltr of ' + v('product') + '.\n' +
        'My phone: ' + v('phone') +
        (v('message') ? '\n\n' + v('message') : '');
      window.open(waLink(msg), '_blank', 'noopener');
      form.reset();
      toast('Opening WhatsApp…');
    });
  }

  /* ---------- Reviews carousel ---------- */
  function initReviews() {
    var track = $('#reviewTrack');
    $$('[data-scroll]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = track.querySelector('.review');
        var dx = (card ? card.getBoundingClientRect().width + 18 : 300) * parseInt(btn.dataset.scroll, 10);
        track.scrollBy({ left: dx, behavior: reducedMotion ? 'auto' : 'smooth' });
      });
    });
  }

  /* ---------- Boot ---------- */
  function init() {
    $('#year').textContent = new Date().getFullYear();
    initTheme();
    initNav();
    observeReveals(document);
    initStats();
    updateOpenStatus();
    setInterval(updateOpenStatus, 60 * 1000);
    initProducts();
    initOrder();
    initForm();
    initReviews();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
