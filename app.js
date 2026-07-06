/* ============================================================
   Syncr, landing interactions
   - Live GitHub data: contributors + star count (real fetch)
   - Sticky nav shadow, mobile menu, scroll reveal, video toggle
   ============================================================ */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* -- Sticky nav border on scroll -- */
  var nav = $('#nav');
  var onScroll = function () {
    if (!nav) return;
    if (window.scrollY > 8) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* -- Mobile menu -- */
  var burger = $('#burger');
  if (burger && nav) {
    burger.addEventListener('click', function () { nav.classList.toggle('open'); });
    $$('#navLinks a').forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('open'); });
    });
  }

  /* -- Scroll reveal -- */
  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  }
  function observeReveal(root) {
    var reveal = $$('.reveal', root || document);
    if (io) {
      reveal.forEach(function (el) {
        if (!el.classList.contains('in')) io.observe(el);
      });
    } else {
      reveal.forEach(function (el) { el.classList.add('in'); });
    }
  }
  observeReveal();
  // Dynamic pages (activity page, builder) call this after injecting content
  window.__syncrRevealObserve = observeReveal;

  /* -- Click to play/pause the demo video -- */
  var vid = $('.showcase-frame video');
  if (vid) {
    vid.addEventListener('click', function () {
      if (vid.paused) vid.play(); else vid.pause();
    });
  }

  /* ----------------------------------------------------------
     LIVE GitHub data
     One repo call for stars, one contributors call for people.
     Fails soft: on error or rate-limit, we show a graceful note.
     ---------------------------------------------------------- */
  var REPO = (($('#people') || {}).dataset || {}).repo || 'Clawb1t/Syncr';
  var API  = 'https://api.github.com/repos/' + REPO;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* stars in the nav + proof strip */
  fetch(API, { headers: { 'Accept': 'application/vnd.github+json' } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var navEl   = $('#navStars');
      var proofEl = $('#statStars');
      if (d && typeof d.stargazers_count === 'number') {
        var n = d.stargazers_count.toLocaleString();
        if (navEl)   { navEl.textContent   = n; navEl.title = n + ' stars on GitHub'; }
        if (proofEl) { proofEl.textContent = n; }
      }
    })
    .catch(function () { /* keep the "GitHub" label */ });

  /* contributors grid */
  var wrap = $('#people');
  var load = $('#peopleLoad');

  function renderPeople(list) {
    if (!wrap) return;
    var html = list.map(function (c) {
      var name = c.login;
      var url  = c.html_url;
      var av   = c.avatar_url + (c.avatar_url.indexOf('?') > -1 ? '&' : '?') + 's=80';
      var n    = c.contributions;
      var label = n === 1 ? '1 commit' : (n ? n + ' commits' : 'contributor');
      return (
        '<a class="person" href="' + esc(url) + '" target="_blank" rel="noopener" title="' + esc(name) + ' on GitHub">' +
          '<img src="' + esc(av) + '" alt="" loading="lazy" width="40" height="40" />' +
          '<div><div class="pn">' + esc(name) + '</div><div class="pc mono">' + esc(label) + '</div></div>' +
        '</a>'
      );
    }).join('');
    wrap.innerHTML = html;
  }

  fetch(API + '/contributors?per_page=100', { headers: { 'Accept': 'application/vnd.github+json' } })
    .then(function (r) {
      if (r.status === 403) throw new Error('rate');
      if (!r.ok) throw new Error('http');
      return r.json();
    })
    .then(function (data) {
      if (!Array.isArray(data) || !data.length) throw new Error('empty');
      data.sort(function (a, b) { return (b.contributions || 0) - (a.contributions || 0); });
      data = data.filter(function (c) { return c.type !== 'Bot' && !/\[bot\]$/i.test(c.login); });
      renderPeople(data);
    })
    .catch(function (err) {
      if (!load) return;
      if (err && err.message === 'rate') {
        load.innerHTML = 'GitHub is rate-limiting right now. ' +
          '<a href="https://github.com/' + esc(REPO) + '/graphs/contributors" target="_blank" rel="noopener" style="color:var(--indigo-hi)">See contributors on GitHub &rarr;</a>';
      } else {
        load.classList.add('err');
        load.innerHTML = 'Could not load the live list. ' +
          '<a href="https://github.com/' + esc(REPO) + '/graphs/contributors" target="_blank" rel="noopener" style="color:var(--indigo-hi)">View on GitHub &rarr;</a>';
      }
    });

  /* ----------------------------------------------------------
     SUBPAGES, all guarded so this stays a no-op on the home page.
     ---------------------------------------------------------- */

  /* Shared: latest release, feeds #footVersion, #relVersion etc. */
  var footVer = $('#footVersion');
  var relVersion = $('#relVersion');
  if (footVer || relVersion) {
    fetch(API + '/releases/latest', { headers: { 'Accept': 'application/vnd.github+json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.tag_name) { if (footVer) footVer.textContent = 'Latest on GitHub'; return; }
        var tag = d.tag_name;
        var name = d.name || ('Syncr ' + tag);
        var when = d.published_at ? new Date(d.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
        if (footVer) footVer.textContent = 'Latest release ' + tag + (when ? ' \u00b7 ' + when : '');
        if (relVersion) relVersion.textContent = tag;
        var relName = $('#relName'); if (relName) relName.textContent = name;
        var relMeta = $('#relMeta'); if (relMeta) relMeta.textContent = when ? ('Published ' + when + ' \u00b7 for Firefox') : 'Latest build for Firefox';
        var relDl = $('#relDownload');
        if (relDl && d.assets && d.assets.length) {
          var installer = d.assets.filter(function (a) { return /setup.*\.exe$/i.test(a.name); })[0]
            || d.assets.filter(function (a) { return /\.exe$/i.test(a.name); })[0];
          if (installer) relDl.href = installer.browser_download_url;
        }
      })
      .catch(function () { if (footVer) footVer.textContent = 'Latest on GitHub'; });
  }

  /* -- Year in footer, if present -- */
  var y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

  /* ----------------------------------------------------------
     Changelog page: tabbed, live markdown from the repo docs.
     ---------------------------------------------------------- */
  var clTabs = $$('.cl-tab');
  if (clTabs.length) {
    var loaded = {};

    function mdInline(s) {
      s = esc(s);
      s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
      s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (m, t, u) {
        return '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + t + '</a>';
      });
      return s;
    }

    function renderMd(md) {
      var lines = md.split('\n');
      var out = [], list = null, inEntry = false, started = false;
      function closeList() { if (list) { out.push('<ul>' + list.join('') + '</ul>'); list = null; } }
      function closeEntry() { closeList(); if (inEntry) { out.push('</div>'); inEntry = false; } }
      for (var i = 0; i < lines.length; i++) {
        var ln = lines[i];
        var h3 = ln.match(/^###\s+(.+)/);
        if (h3) {
          started = true; closeEntry();
          var ver = h3[1].replace(/\s*\(current\)\s*/i, '');
          var isCur = /\(current\)/i.test(h3[1]);
          out.push('<div class="cl-entry"><h2><span class="cl-ver">' + esc(ver) + '</span>' +
            (isCur ? '<span class="act-badge listen">Current</span>' : '') + '</h2>');
          inEntry = true; continue;
        }
        if (!started) continue;
        var h4 = ln.match(/^####?\s+(.+)/);
        if (h4) { closeList(); out.push('<h3>' + mdInline(h4[1]) + '</h3>'); continue; }
        var bold = ln.match(/^\*\*(.+)\*\*\s*$/);
        if (bold) { closeList(); out.push('<h3>' + mdInline(bold[1]) + '</h3>'); continue; }
        var li = ln.match(/^\s*[-*]\s+(.+)/);
        if (li) { list = list || []; list.push('<li>' + mdInline(li[1]) + '</li>'); continue; }
        if (/^\s*---\s*$/.test(ln)) { continue; }
        if (ln.trim() === '') { closeList(); continue; }
        closeList();
        out.push('<p style="color:var(--t2);font-size:.93rem">' + mdInline(ln.trim()) + '</p>');
      }
      closeEntry();
      return out.join('');
    }

    function loadPanel(key) {
      var panel = $('#cl' + key.charAt(0).toUpperCase() + key.slice(1));
      if (!panel || loaded[key]) return;
      loaded[key] = true;
      var src = panel.dataset.src;
      fetch(src)
        .then(function (r) { if (!r.ok) throw new Error('http'); return r.text(); })
        .then(function (md) {
          var html = renderMd(md);
          panel.innerHTML = html || '<p class="cl-fallback">No entries found.</p>';
        })
        .catch(function () {
          loaded[key] = false;
          var fb = $('#clFallback');
          panel.innerHTML = '';
          if (fb) fb.hidden = false;
        });
    }

    function activate(key) {
      clTabs.forEach(function (t) {
        var on = t.dataset.log === key;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      $$('.cl-panel').forEach(function (p) {
        p.hidden = p.id !== ('cl' + key.charAt(0).toUpperCase() + key.slice(1));
      });
      loadPanel(key);
    }

    clTabs.forEach(function (t) {
      t.addEventListener('click', function () { activate(t.dataset.log); });
    });
    activate('extension');
  }

  /* ----------------------------------------------------------
     Activities index: live from GitHub + search + category filter.
     Fetches registry.json, then each activity's metadata.json.
     Falls back to the static cards already in the HTML if fetch fails.
     ---------------------------------------------------------- */
  var actsGrid = $('#actsGrid');
  if (actsGrid) {
    var searchEl = $('#actSearch');
    var chipsEl  = $('#actChips');
    var emptyEl  = $('#actsEmpty');
    var curCat = 'all', curQ = '';

    var RAW = 'https://raw.githubusercontent.com/DSyncr/activities/main/extension/activities/';
    var BADGE_MAP = { 'LISTENING TO': 'listen', 'LISTENING': 'listen', 'WATCHING': 'watch', 'BROWSING': 'watch' };
    var BADGE_LABEL = { 'LISTENING TO': 'Listening', 'LISTENING': 'Listening', 'WATCHING': 'Watching', 'BROWSING': 'Browsing' };
    var NEW_COUNT = 5; /* last N activities in registry get a "New" badge */

    function badgeClass(type) { return BADGE_MAP[(type || '').toUpperCase()] || 'watch'; }
    function badgeLabel(act) {
      if (act.privacy) return 'Privacy-first';
      return BADGE_LABEL[(act.activityType || '').toUpperCase()] || act.activityType || '';
    }

    function renderCard(act, isNew) {
      var logoUrl = RAW + act.id + '/logo.png';
      var badge   = badgeClass(act.activityType);
      var label   = badgeLabel(act);
      var cat     = act.category || 'Other';
      var desc    = act.description || '';
      var slug    = act.id;
      var href    = '/activities/activity.html?id=' + slug;
      var card    = document.createElement('a');
      card.className = 'acard reveal in';
      card.href      = href;
      card.dataset.name = (act.name || '').toLowerCase();
      card.dataset.cat  = cat;
      card.innerHTML =
        '<div class="acard-head">' +
          '<img class="acard-logo" src="' + esc(logoUrl) + '" alt="' + esc(act.name) + '" onerror="this.style.display=\'none\'" /> ' +
          '<div class="acard-badges">' +
            '<span class="act-badge ' + esc(badge) + '">' + esc(label) + '</span>' +
            (isNew ? '<span class="act-badge-new">New</span>' : '') +
          '</div>' +
        '</div>' +
        '<h3>' + esc(act.name) + '</h3>' +
        '<p>' + esc(desc) + '</p>' +
        '<div class="acard-foot"><span class="acard-cat">' + esc(cat) + '</span><span class="acard-go">View activity &rarr;</span></div>';
      return card;
    }

    function applyFilter() {
      var cards = $$('.acard', actsGrid);
      var shown = 0;
      cards.forEach(function (c) {
        var cat  = c.dataset.cat  || '';
        var name = (c.dataset.name || '').toLowerCase();
        var okCat = curCat === 'all' || cat === curCat;
        var okQ   = !curQ || name.indexOf(curQ) > -1 || cat.toLowerCase().indexOf(curQ) > -1;
        var vis   = okCat && okQ;
        c.style.display = vis ? '' : 'none';
        if (vis) shown++;
      });
      if (emptyEl) emptyEl.hidden = shown !== 0;
    }

    function wireControls() {
      if (searchEl) {
        searchEl.addEventListener('input', function () {
          curQ = searchEl.value.trim().toLowerCase(); applyFilter();
        });
      }
      if (chipsEl) {
        chipsEl.addEventListener('click', function (e) {
          var chip = e.target.closest('.chip'); if (!chip) return;
          $$('.chip', chipsEl).forEach(function (c) { c.classList.remove('active'); });
          chip.classList.add('active');
          curCat = chip.dataset.cat || 'all'; applyFilter();
        });
      }
    }

    function ensureChip(cat) {
      if (!chipsEl) return;
      if ($('.chip[data-cat="' + cat + '"]', chipsEl)) return;
      var btn = document.createElement('button');
      btn.className   = 'chip';
      btn.dataset.cat = cat;
      btn.textContent = cat;
      chipsEl.appendChild(btn);
    }

    /* fetch registry + all metadata */
    fetch(RAW + 'registry.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (reg) {
        if (!reg || !Array.isArray(reg.activities)) throw new Error('no registry');
        return Promise.all(reg.activities.map(function (id) {
          return fetch(RAW + id + '/metadata.json')
            .then(function (r) { return r.ok ? r.json() : null; })
            .catch(function () { return null; });
        }));
      })
      .then(function (metas) {
        var valid = metas.filter(Boolean);
        if (!valid.length) throw new Error('no metas');
        /* update counter */
        var totalEl = document.getElementById('actsTotal');
        if (totalEl) totalEl.textContent = valid.length;
        /* replace static cards */
        actsGrid.innerHTML = '';
        var newIds = new Set(valid.slice(-NEW_COUNT).map(function (a) { return a.id; }));
        valid.forEach(function (act) {
          ensureChip(act.category || 'Other');
          actsGrid.appendChild(renderCard(act, newIds.has(act.id)));
        });
        wireControls();
        applyFilter();
        /* re-run scroll reveal on new elements */
        if ('IntersectionObserver' in window) {
          var io2 = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io2.unobserve(e.target); } });
          }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
          $$('.acard', actsGrid).forEach(function (el) { el.classList.remove('in'); io2.observe(el); });
        }
      })
      .catch(function () {
        /* fallback: static cards already in HTML still work */
        wireControls();
        applyFilter();
      });
  }

  /* -- Screenshot carousel -- */
  var SHOTS = [
    'assets/shots/discord-1.png',
    'assets/shots/discord-2.png',
    'assets/shots/discord-3.png',
    'assets/shots/discord-4.png',
    'assets/shots/discord-5.png',
    'assets/shots/discord-6.png',
  ];
  var shotIdx = 0;
  var shotMain = document.getElementById('shotMain');
  if (shotMain) {
    var shotAlt  = document.getElementById('shotAlt');
    var shotDots = $$('.shot-dot', document.getElementById('shotDots'));

    function goToShot(i) {
      var next = (i + 1) % SHOTS.length;
      shotMain.classList.add('is-fading');
      shotAlt.classList.add('is-fading');
      setTimeout(function () {
        shotMain.querySelector('img').src = SHOTS[i];
        shotAlt.querySelector('img').src  = SHOTS[next];
        shotMain.classList.remove('is-fading');
        shotAlt.classList.remove('is-fading');
        shotDots.forEach(function (d, di) { d.classList.toggle('active', di === i); });
        shotIdx = i;
      }, 220);
    }

    shotDots.forEach(function (dot) {
      dot.addEventListener('click', function () { goToShot(+this.dataset.i); });
    });

    /* auto-advance every 4s */
    setInterval(function () { goToShot((shotIdx + 1) % SHOTS.length); }, 4000);
  }

  /* -- Live activity count (proof strip + activities page) -- */
  var RAW_REG = 'https://raw.githubusercontent.com/DSyncr/activities/main/extension/activities/';
  var actCountEls = document.querySelectorAll('#actCount');
  if (actCountEls.length) {
    fetch(RAW_REG + 'registry.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.activities && data.activities.length) {
          actCountEls.forEach(function (el) { el.textContent = data.activities.length; });
        }
      })
      .catch(function () { /* leave default text */ });
  }

  /* ----------------------------------------------------------
     Web bridge: installed-user control panel (home page only).
     index.html BECOMES the user's Syncr dashboard when the
     extension is present. Dashboard-vs-marketing visibility is
     handled by CSS (html[data-syncr-extension]); this code fills
     content and wires the live controls. Verbose [Syncr] logging
     is on so any breakage is visible in the console.
     ---------------------------------------------------------- */
  var SYNCR_DEBUG = true;
  function slog() {
    if (!SYNCR_DEBUG || typeof console === 'undefined') return;
    try { console.log.apply(console, ['%c[Syncr]', 'color:#5662f6;font-weight:bold'].concat([].slice.call(arguments))); } catch (e) {}
  }
  function swarn() {
    if (typeof console === 'undefined') return;
    try { console.warn.apply(console, ['[Syncr]'].concat([].slice.call(arguments))); } catch (e) {}
  }

  (function initSyncrBridge() {
    var dash = $('#syncrDashboard');
    var hasSDK = typeof SyncrWeb !== 'undefined';
    slog('bridge init | SDK loaded:', hasSDK, '| dashboard el:', !!dash,
         '| data-syncr-extension:', document.documentElement.getAttribute('data-syncr-extension'));

    if (!dash) { slog('no #syncrDashboard here — not the home page, skipping.'); return; }
    if (!hasSDK) {
      swarn('SDK (window.SyncrWeb) missing. Ensure /js/dsyncr-web-sdk.js loads BEFORE app.js. Dashboard cannot run.');
      return;
    }

    var RAW_ACT = 'https://raw.githubusercontent.com/DSyncr/activities/main/extension/activities/';
    var LATEST_API = 'https://api.github.com/repos/Clawb1t/Syncr/releases/latest';

    var els = {
      version:  $('#dashVersion'),
      verDot:   $('#dashVerDot'),
      verBadge: $('#dashVerBadge'),
      update:   $('#dashUpdateBadge'),
      hostDot:  $('#dashHostDot'),
      host:     $('#dashHost'),
      onCount:  $('#dashOnCount'),
      countDot: $('#dashCountDot'),
      grid:     $('#dashGrid'),
      search:   $('#dashSearch'),
      whatIs:   $('#dashWhatIs'),
      navBadge: $('#navUserBadge')
    };
    slog('resolved elements:', Object.keys(els).filter(function (k) { return !els[k]; }).length
      ? 'MISSING -> ' + Object.keys(els).filter(function (k) { return !els[k]; }).join(', ')
      : 'all present');

    var state = { activities: [], filter: 'all', query: '' };

    function semverGt(a, b) {
      var pa = String(a || '').replace(/^v/, '').split('.').map(Number);
      var pb = String(b || '').replace(/^v/, '').split('.').map(Number);
      for (var i = 0; i < 3; i++) {
        if ((pa[i] || 0) > (pb[i] || 0)) return true;
        if ((pa[i] || 0) < (pb[i] || 0)) return false;
      }
      return false;
    }

    function logoFor(id) { return RAW_ACT + encodeURIComponent(id) + '/logo.png'; }

    var toastTimer;
    function toast(msg) {
      var t = $('#syncrToast');
      if (!t) { t = document.createElement('div'); t.id = 'syncrToast'; t.className = 'syncr-toast'; document.body.appendChild(t); }
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3800);
      slog('toast:', msg);
    }

    function updateCounts() {
      var on = state.activities.filter(function (a) { return a.enabled; }).length;
      if (els.onCount)  els.onCount.textContent = on;
      if (els.countDot) els.countDot.classList.toggle('dstat-dot--ok', on > 0);
    }

    function cardHTML(a) {
      var name = esc(a.name || a.id);
      var on = !!a.enabled;
      return '<div class="dact' + (on ? ' dact--on' : '') + '" data-id="' + esc(a.id) + '">' +
        '<img class="dact-logo" src="' + esc(logoFor(a.id)) + '" alt="" loading="lazy" ' +
          'onerror="this.style.visibility=&quot;hidden&quot;" />' +
        '<div class="dact-body">' +
          '<span class="dact-name"><a href="/activities/activity.html?id=' + esc(a.id) + '">' + name + '</a>' +
            (a.isTest ? '<span class="dact-test">Test</span>' : '') + '</span>' +
          '<span class="dact-cat">' + (on ? 'Sharing to Discord' : 'Off') + '</span>' +
        '</div>' +
        '<label class="syncr-toggle-wrap" title="' + (on ? 'Disable' : 'Enable') + ' ' + name + '">' +
          '<input type="checkbox" class="syncr-toggle-input"' + (on ? ' checked' : '') + ' data-id="' + esc(a.id) + '" ' +
            'aria-label="' + (on ? 'Disable' : 'Enable') + ' ' + name + '" />' +
          '<span class="syncr-toggle-track"><span class="syncr-toggle-thumb"></span></span>' +
        '</label>' +
      '</div>';
    }

    function renderGrid() {
      if (!els.grid) return;
      var q = state.query.trim().toLowerCase();
      var list = state.activities.filter(function (a) {
        if (state.filter === 'on'  && !a.enabled) return false;
        if (state.filter === 'off' &&  a.enabled) return false;
        if (q) {
          var hay = (String(a.name || '') + ' ' + String(a.id || '')).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });
      slog('renderGrid:', list.length, 'of', state.activities.length, '| filter:', state.filter, '| query:', JSON.stringify(q));
      if (!state.activities.length) {
        els.grid.innerHTML = '<div class="dash-empty">The extension reported no activities. Try reloading the page.</div>';
        return;
      }
      if (!list.length) {
        els.grid.innerHTML = '<div class="dash-empty">Nothing matches. Clear the search or switch the filter.</div>';
        return;
      }
      list.sort(function (a, b) {
        var d = (b.enabled ? 1 : 0) - (a.enabled ? 1 : 0);
        if (d) return d;
        return String(a.name || a.id).localeCompare(String(b.name || b.id));
      });
      els.grid.innerHTML = list.map(cardHTML).join('');
      $$('.syncr-toggle-input', els.grid).forEach(function (inp) {
        inp.addEventListener('change', onToggle);
      });
    }

    function onToggle(e) {
      var inp = e.target;
      var id = inp.getAttribute('data-id');
      var want = inp.checked;
      var card = inp.closest ? inp.closest('.dact') : null;
      slog('toggle requested:', id, '->', want ? 'ENABLE' : 'DISABLE');
      inp.disabled = true;
      SyncrWeb.setActivityEnabled(id, want).then(function (res) {
        slog('setActivityEnabled OK:', JSON.stringify(res));
        var actual = res && typeof res.enabled === 'boolean' ? res.enabled : want;
        var a = state.activities.filter(function (x) { return x.id === id; })[0];
        if (a) a.enabled = actual;
        inp.checked = actual;
        inp.disabled = false;
        if (card) {
          card.classList.toggle('dact--on', actual);
          var cat = card.querySelector('.dact-cat');
          if (cat) cat.textContent = actual ? 'Sharing to Discord' : 'Off';
        }
        updateCounts();
        toast((a && (a.name || a.id) ? (a.name || a.id) : id) + (actual ? ' is now sharing' : ' turned off'));
      }).catch(function (err) {
        swarn('setActivityEnabled FAILED for', id, '-', err && err.message ? err.message : err);
        inp.checked = !want;
        inp.disabled = false;
        toast('Could not update ' + id + '. Is Discord (the host) connected?');
      });
    }

    function renderHost(connected) {
      if (els.host) els.host.textContent = connected ? 'Connected' : 'Not connected';
      if (els.hostDot) {
        els.hostDot.classList.toggle('dstat-dot--ok', connected);
        els.hostDot.classList.toggle('dstat-dot--warn', !connected);
      }
      slog('hostConnected:', connected);
    }

    function checkUpdate(current) {
      if (!current) { slog('no installed version — skipping update check'); return; }
      slog('checking latest release vs installed v' + current);
      fetch(LATEST_API, { headers: { Accept: 'application/vnd.github+json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d || !d.tag_name) { slog('no release data'); return; }
          slog('latest release:', d.tag_name, '| installed:', current);
          if (semverGt(d.tag_name, current)) {
            if (els.update) { els.update.textContent = 'Update to ' + d.tag_name; els.update.hidden = false; }
            if (els.verBadge) els.verBadge.hidden = true;
            if (els.verDot) { els.verDot.classList.remove('dstat-dot--ok'); els.verDot.classList.add('dstat-dot--warn'); }
          } else {
            if (els.verBadge) els.verBadge.hidden = false;
            if (els.update) els.update.hidden = true;
          }
        })
        .catch(function (err) { swarn('update check failed:', err && err.message ? err.message : err); });
    }

    function loadStatus() {
      slog('calling getStatus()...');
      return SyncrWeb.getStatus().then(function (s) {
        slog('getStatus response:', JSON.stringify(s));
        var v = (s && s.version) || SyncrWeb.getVersion();
        if (els.version)  els.version.textContent = v ? ('v' + v) : 'Unknown';
        if (els.navBadge) els.navBadge.textContent = v ? ('v' + v) : 'Syncr';
        renderHost(!!(s && s.hostConnected));
        state.activities = (s && s.activities ? s.activities : []).slice();
        slog('activities loaded:', state.activities.length,
             '| enabled:', state.activities.filter(function (a) { return a.enabled; }).length,
             '| testMode:', !!(s && s.testModeEnabled));
        updateCounts();
        renderGrid();
        checkUpdate(v);
        return s;
      });
    }

    /* wire controls */
    if (els.search) {
      els.search.addEventListener('input', function () { state.query = els.search.value || ''; renderGrid(); });
    }
    $$('.dfilter').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('.dfilter').forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
        btn.classList.add('active'); btn.setAttribute('aria-selected', 'true');
        state.filter = btn.getAttribute('data-filter') || 'all';
        slog('filter ->', state.filter);
        renderGrid();
      });
    });
    if (els.whatIs) {
      els.whatIs.addEventListener('click', function (e) {
        e.preventDefault();
        document.documentElement.classList.add('syncr-show-marketing');
        var m = $('#marketing-content');
        if (m) m.scrollIntoView({ behavior: 'smooth', block: 'start' });
        slog('revealed marketing content beneath dashboard');
      });
    }

    /* live updates from the popup or other tabs */
    SyncrWeb.onActivitiesChanged(function (detail) {
      slog('activities-changed event:', JSON.stringify(detail), '- reloading status');
      loadStatus().catch(function (err) { swarn('reload after change failed:', err && err.message ? err.message : err); });
    });

    /* boot */
    SyncrWeb.whenReady().then(function (res) {
      slog('whenReady:', JSON.stringify(res));
      if (!res.installed) {
        swarn('whenReady reports NOT installed. Dashboard stays hidden (CSS gate). If you DO have Syncr, the content script did not annotate <html> in time.');
        return;
      }
      if (document.documentElement.getAttribute('data-syncr-extension') !== 'true') {
        slog('SDK says installed but <html data-syncr-extension> was missing — setting it so CSS reveals the dashboard.');
        document.documentElement.setAttribute('data-syncr-extension', 'true');
      }
      loadStatus().catch(function (err) {
        swarn('initial getStatus failed:', err && err.message ? err.message : err);
        if (els.grid) els.grid.innerHTML = '<div class="dash-empty">Could not reach the extension. Reload the page to retry.</div>';
        renderHost(false);
      });
    }).catch(function (err) { swarn('whenReady failed:', err && err.message ? err.message : err); });
  })();

})();
