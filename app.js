/* ============================================================
   Syncr landing, interactions
   ============================================================ */
(function () {
  'use strict';

  /* -- Nav: scrolled state + mobile menu -------------------- */
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
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        if (window.innerWidth <= 900) links.style.display = '';
      });
    });
  }

  /* -- Scroll reveal ---------------------------------------- */
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
      el.style.transitionDelay = (i % 3) * 60 + 'ms';
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* -- Demo video: tap to play or pause, restart in view ---- */
  var video = document.querySelector('.demo-video');
  var frame = document.querySelector('.demo-frame');
  if (video && frame) {
    frame.addEventListener('click', function () {
      if (video.paused) { video.play(); frame.classList.remove('paused'); }
      else { video.pause(); frame.classList.add('paused'); }
    });
    // pause when scrolled out of view, resume when back (saves cycles)
    if ('IntersectionObserver' in window) {
      var vio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { if (video.paused && !frame.classList.contains('paused')) video.play(); }
          else { if (!video.paused) video.pause(); }
        });
      }, { threshold: 0.35 });
      vio.observe(frame);
    }
  }

  /* -- Popup toggles: clickable for fun --------------------- */
  document.querySelectorAll('.pm-toggle').forEach(function (t) {
    t.style.cursor = 'pointer';
    t.addEventListener('click', function () { t.classList.toggle('on'); });
  });

  /* -- Year in footer --------------------------------------- */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

})();
