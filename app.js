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

  /* -- Year in footer, if present -- */
  var y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

})();
