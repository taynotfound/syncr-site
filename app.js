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
  var reveal = $$('.reveal');
  if ('IntersectionObserver' in window && reveal.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveal.forEach(function (el) { io.observe(el); });
  } else {
    reveal.forEach(function (el) { el.classList.add('in'); });
  }

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

  /* stars in the nav */
  fetch(API, { headers: { 'Accept': 'application/vnd.github+json' } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var el = $('#navStars');
      if (el && d && typeof d.stargazers_count === 'number') {
        el.textContent = d.stargazers_count.toLocaleString();
        el.title = d.stargazers_count + ' stars on GitHub';
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

    var RAW = 'https://raw.githubusercontent.com/Clawb1t/Syncr/main/extension/activities/';
    var BADGE_MAP = { 'LISTENING TO': 'listen', 'LISTENING': 'listen', 'WATCHING': 'watch', 'BROWSING': 'watch' };
    var BADGE_LABEL = { 'LISTENING TO': 'Listening', 'LISTENING': 'Listening', 'WATCHING': 'Watching', 'BROWSING': 'Browsing' };

    function badgeClass(type) { return BADGE_MAP[(type || '').toUpperCase()] || 'watch'; }
    function badgeLabel(act) {
      if (act.privacy) return 'Privacy-first';
      return BADGE_LABEL[(act.activityType || '').toUpperCase()] || act.activityType || '';
    }

    function renderCard(act) {
      var logoUrl = RAW + act.id + '/logo.png';
      var badge   = badgeClass(act.activityType);
      var label   = badgeLabel(act);
      var cat     = act.category || 'Other';
      var desc    = act.description || '';
      var slug    = act.id;
      /* link to static detail page if it exists, else GitHub source */
      var href    = '/activities/' + slug + '.html';
      var card    = document.createElement('a');
      card.className = 'acard reveal in';
      card.href      = href;
      card.dataset.name = (act.name || '').toLowerCase();
      card.dataset.cat  = cat;
      card.innerHTML =
        '<div class="acard-head">' +
          '<div class="acard-logo"><img src="' + esc(logoUrl) + '" alt="' + esc(act.name) + '" onerror="this.style.display=\'none\'" /></div>' +
          '<span class="act-badge ' + esc(badge) + '">' + esc(label) + '</span>' +
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
    fetch(RAW + '../registry.json')
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
        /* replace static cards */
        actsGrid.innerHTML = '';
        valid.forEach(function (act) {
          ensureChip(act.category || 'Other');
          actsGrid.appendChild(renderCard(act));
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

})();
