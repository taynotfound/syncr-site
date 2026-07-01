/* ============================================================
   Syncr landing — interactions
   ============================================================ */
(function () {
  'use strict';

  /* ── Nav: scrolled state + mobile menu ─────────────────── */
  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  var links = document.querySelector('.nav-links');

  function onScroll() {
    if (window.scrollY > 20) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (burger && links) {
    burger.addEventListener('click', function () {
      var open = links.style.display === 'flex';
      if (open) {
        links.style.display = '';
      } else {
        links.style.display = 'flex';
        links.style.position = 'absolute';
        links.style.top = '58px';
        links.style.right = '16px';
        links.style.flexDirection = 'column';
        links.style.gap = '4px';
        links.style.background = 'var(--elevated)';
        links.style.border = '1px solid var(--border-2)';
        links.style.borderRadius = '12px';
        links.style.padding = '14px 18px';
        links.style.boxShadow = '0 20px 50px -20px rgba(0,0,0,.7)';
      }
    });
    // close on link click
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        if (window.innerWidth <= 900) links.style.display = '';
      });
    });
  }

  /* ── Scroll reveal ─────────────────────────────────────── */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el, i) {
      // slight stagger within a group
      el.style.transitionDelay = (i % 3) * 60 + 'ms';
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ── Live demo: cycle the Discord presence card ────────── */
  var scenes = [
    {
      header: 'Listening to YouTube Music',
      art: 'assets/activities/youtube-music.svg',
      mini: 'assets/activities/youtube-music.svg',
      t1: 'Midnight City', t2: 'M83', t3: "Hurry Up, We're Dreaming",
      live: 'Midnight City — M83'
    },
    {
      header: 'Watching YouTube',
      art: 'assets/activities/youtube.svg',
      mini: 'assets/activities/youtube.svg',
      t1: 'Building a Mechanical Keyboard', t2: 'Hands-on tech', t3: 'YouTube',
      live: 'Building a Mechanical Keyboard'
    },
    {
      header: 'Browsing Reddit',
      art: 'assets/activities/reddit.svg',
      mini: 'assets/activities/reddit.svg',
      t1: '"What is Syncr and why is it free?"', t2: 'r/discordapp', t3: '↑ 2.4k · 340 comments',
      live: 'r/discordapp — hot posts'
    },
    {
      header: 'Checking Proton Mail',
      art: 'assets/activities/proton-mail.svg',
      mini: 'assets/activities/proton-mail.svg',
      t1: 'Checking mail', t2: 'Proton Mail', t3: 'Privacy-safe status',
      live: 'Checking mail'
    }
  ];

  var el = {
    header: document.querySelector('.dc-presence-h'),
    art: document.getElementById('dc-art-img'),
    mini: document.getElementById('dc-mini-img'),
    t1: document.getElementById('dc-t1'),
    t2: document.getElementById('dc-t2'),
    t3: document.getElementById('dc-t3'),
    live: document.getElementById('pm-live-title')
  };

  var card = document.querySelector('.dc-presence');
  var idx = 0;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function applyScene(s) {
    if (!el.header) return;
    el.header.textContent = s.header;
    if (el.art) el.art.src = s.art;
    if (el.mini) el.mini.src = s.mini;
    if (el.t1) el.t1.textContent = s.t1;
    if (el.t2) el.t2.textContent = s.t2;
    if (el.t3) el.t3.textContent = s.t3;
    if (el.live) el.live.textContent = s.live;
  }

  if (card && el.header && !reduceMotion) {
    setInterval(function () {
      idx = (idx + 1) % scenes.length;
      card.style.transition = 'opacity .32s ease';
      card.style.opacity = '0';
      setTimeout(function () {
        applyScene(scenes[idx]);
        card.style.opacity = '1';
      }, 320);
    }, 3600);
  }

  /* ── Popup toggles: make them clickable for fun ────────── */
  document.querySelectorAll('.pm-toggle').forEach(function (t) {
    t.style.cursor = 'pointer';
    t.addEventListener('click', function () { t.classList.toggle('on'); });
  });

  /* ── Year in footer (if present) ───────────────────────── */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

})();
