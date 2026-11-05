/* Subtle motion for sslslaw.com: homepage opening, fade-ups on scroll.
   Does nothing for visitors whose device asks for reduced motion. */
(function () {
  if (!window.matchMedia || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("motion");

  var REVEAL = ".section-inner > .section-label, .section-inner > h2, .section-inner > .body-copy, .split-box, .practice-card, .values > *, .cta-box, .content-card, .team-card, .contact-item, .contact-form, .website-disclaimer, .enquiry-warning";
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

  function modalOpen() { return document.body.classList.contains("disclaimer-modal-open"); }

  function playOpening(root) {
    var hero = root.querySelector(".hero, .page-hero");
    if (!hero || hero.classList.contains("play")) return;
    var go = function () { requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add("play"); }); }); };
    if (!modalOpen()) return go();
    // first visit: wait until the website disclaimer is closed, so the opening isn't missed
    var mo = new MutationObserver(function () { if (!modalOpen()) { mo.disconnect(); go(); } });
    mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }

  function setUp() {
    var app = document.getElementById("app");
    if (!app) return;
    var seen = new Map();
    app.querySelectorAll(REVEAL).forEach(function (el) {
      if (el.classList.contains("rv")) return;
      // stagger items that sit side by side in the same row
      var p = el.parentElement, n = seen.get(p) || 0;
      seen.set(p, n + 1);
      el.style.setProperty("--rv-delay", Math.min(n, 5) * 0.09 + "s");
      el.classList.add("rv");
      io.observe(el);
    });
    playOpening(app);
  }

  function start() {
    setUp();
    // the site swaps page content without reloading; set up each new page as it appears
    var app = document.getElementById("app");
    if (app) new MutationObserver(setUp).observe(app, { childList: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
