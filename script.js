"use strict";

const localizations = JSON.parse(document.querySelector("#localizations").textContent);
const root = document.documentElement;
const localeMenu = document.querySelector(".locale");
const localeToggle = localeMenu.querySelector("summary");
const menuToggle = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");
const content = document.querySelector(".page-scroll");
const mobileContact = document.querySelector(".mobile-contact");
const responsiveNav = matchMedia("(max-width: 900px)");
const compactPage = matchMedia("(max-width: 640px)");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const words = [];
let language = "fr";
let frame = 0;

function setMenu(open, returnFocus = false) {
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", localizations[language][open ? "close" : "menu"]);
  mobileNav.classList.toggle("is-open", open);
  mobileNav.inert = !open;
  content.inert = open;
  mobileContact.inert = open;
  document.body.classList.toggle("menu-open", open);
  if (returnFocus) menuToggle.focus();
}

function setLanguage(nextLanguage) {
  if (!Object.hasOwn(localizations, nextLanguage)) return;
  language = nextLanguage;
  const copy = localizations[language];
  root.lang = language;
  root.dir = language === "ar" ? "rtl" : "ltr";
  document.title = copy.metaTitle;
  document.querySelector('meta[name="description"]').content = copy.metaDescription;
  document.querySelector('meta[property="og:title"]').content = copy.metaTitle;
  document.querySelector('meta[property="og:description"]').content = copy.metaDescription;
  document.querySelector("#language-code").textContent = language === "ar" ? "عر" : language.toUpperCase();

  words.length = 0;
  for (const element of document.querySelectorAll("[data-i18n]")) {
    const text = copy[element.getAttribute("data-i18n")];
    if (!element.hasAttribute("data-words") || reducedMotion.matches) {
      element.textContent = text;
      continue;
    }
    element.replaceChildren();
    for (const [index, word] of text.trim().split(/\s+/).entries()) {
      if (index) element.append(" ");
      const span = document.createElement("span");
      span.className = "word";
      span.textContent = word;
      element.append(span);
      words.push(span);
    }
  }

  for (const element of document.querySelectorAll("[data-attr]")) {
    const [attribute, key] = element.dataset.attr.split(":");
    element.setAttribute(attribute, copy[key]);
  }
  document.querySelector(".tagline").setAttribute("aria-label", copy.tagline + " " + copy.tagline2);
  for (const option of document.querySelectorAll("[data-lang]")) {
    option.setAttribute("aria-pressed", String(option.dataset.lang === language));
  }
  const whatsapp = "https://wa.me/212661236034?text=" + encodeURIComponent(copy.waMessage);
  for (const link of document.querySelectorAll("[data-whatsapp]")) link.href = whatsapp;
  menuToggle.setAttribute("aria-label", copy[mobileNav.inert ? "menu" : "close"]);
  scheduleFrame();
}

function setupAsset(image) {
  const container = image.closest("[data-media]");
  const sources = [image.dataset.src, ...(image.dataset.srcFallback ?? "").split("|").filter(Boolean)];
  let nextSource = 0;
  function loadNextSource() {
    if (nextSource < sources.length) image.src = sources[nextSource++];
  }

  image.addEventListener("load", async () => {
    await image.decode?.().catch(() => {});
    image.hidden = false;
    container.hidden = false;
    container.classList.add("has-media");
    scheduleFrame();
  });
  image.addEventListener("error", loadNextSource);
  loadNextSource();
}

const journey = document.querySelector(".journey");
const heroArt = document.querySelector(".hero-art");
const origin = document.querySelector(".hero-origin");
const sun = document.querySelector(".hero-sun");
const flight = document.querySelector(".flight");
const landing = document.querySelector(".landing-mark");
const tagline = document.querySelector(".tagline");
const anchors = [...document.querySelectorAll(".desktop-nav a[href^='#'], .mobile-nav a[href^='#']")];
const destinations = [...new Set(anchors.map(link => link.hash))].map(hash => document.getElementById(hash.slice(1)));

const clamp = value => Math.min(Math.max(0, value), 1);
let releaseTime;
const curve = (start, first, second, end, t) => {
  const remains = 1 - t;
  return remains ** 3 * start + 3 * remains ** 2 * t * first + 3 * remains * t ** 2 * second + t ** 3 * end;
};

function drawFlight(viewHeight, now) {
  if (reducedMotion.matches || !heroArt.classList.contains("has-media")) {
    journey.classList.remove("motion-ready");
    return;
  }

  releaseTime ??= now + 240;
  const drop = clamp((now - releaseTime) / 2050);
  const falling = drop ** 1.6;
  const stage = journey.getBoundingClientRect();
  const source = origin.getBoundingClientRect();
  const sunlight = sun.getBoundingClientRect();
  const target = landing.getBoundingClientRect();
  const startX = source.left - stage.left;
  const startY = source.top - stage.top;
  const sunX = sunlight.left + sunlight.width / 2 - stage.left;
  const sunY = sunlight.top + sunlight.height / 2 - stage.top;
  const endX = target.left + target.width / 2 - stage.left;
  const endY = target.top + target.height / 2 - stage.top;
  const landDistance = endY - sunY;
  const sunViewportY = stage.top + sunY;
  const offset = compactPage.matches ? content.scrollTop : window.scrollY;
  const scrollStart = Math.min(viewHeight * .72, sunViewportY + offset);
  const travel = Math.max(1, landDistance * .55, landDistance + scrollStart - viewHeight * .67);
  const scroll = clamp((scrollStart - sunViewportY) / travel);
  const t = scroll * scroll * (3 - 2 * scroll);

  const dropX = curve(startX, startX + (sunX - startX) * .16, sunX + 12, sunX, falling);
  const dropY = curve(startY, startY + 4, sunY - (sunY - startY) * .48, sunY, falling);
  const span = endX - sunX;
  const x = curve(dropX, dropX + span * .16, endX - span * .12, endX, t);
  const y = curve(dropY, dropY + landDistance * .18, endY - landDistance * .18, endY, t);
  const rotation = -22 + 46 * falling - 29 * t + 22 * Math.sin(Math.PI * t);
  const scale = (.62 + .38 * falling) * (1 - t * .34);
  flight.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`;
  journey.classList.add("motion-ready");
  if (drop < 1) scheduleFrame();
}

function highlightNavigation() {
  let active = destinations[0];
  for (const destination of destinations) {
    if (destination.getBoundingClientRect().top <= 160) active = destination;
  }
  for (const link of anchors) {
    if (link.hash === "#" + active.id) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
}

function updateFrame(now) {
  frame = 0;
  const viewHeight = compactPage.matches ? content.clientHeight : window.innerHeight;
  drawFlight(viewHeight, now);
  if (words.length) {
    const rect = tagline.getBoundingClientRect();
    const progress = clamp((viewHeight * .9 - rect.top) / (Math.min(rect.height, viewHeight) * .74));
    const illuminated = Math.floor(progress * words.length);
    words.forEach((word, index) => word.classList.toggle("muted", index >= illuminated));
  }
  highlightNavigation();
}

function scheduleFrame() {
  if (!frame) frame = requestAnimationFrame(updateFrame);
}

const buttonLanguages = document.querySelectorAll("[data-lang]");
for (const button of buttonLanguages) {
  button.addEventListener("click", () => {
    const inMenu = localeMenu.contains(button);
    setLanguage(button.dataset.lang);
    localeMenu.open = false;
    if (inMenu) localeToggle.focus();
  });
}

menuToggle.addEventListener("click", () => {
  localeMenu.open = false;
  setMenu(mobileNav.inert);
});

for (const link of mobileNav.querySelectorAll("a")) {
  link.addEventListener("click", () => setMenu(false, link.hasAttribute("data-whatsapp")));
}

document.addEventListener("click", event => {
  if (!localeMenu.contains(event.target)) localeMenu.open = false;
});

document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (localeMenu.open) {
    localeMenu.open = false;
    localeToggle.focus();
  } else if (!mobileNav.inert) {
    setMenu(false, true);
  }
});

responsiveNav.addEventListener("change", event => {
  if (!event.matches) setMenu(false);
});
reducedMotion.addEventListener("change", () => setLanguage(language));
window.addEventListener("scroll", scheduleFrame, { passive: true });
content.addEventListener("scroll", scheduleFrame, { passive: true });
window.addEventListener("resize", scheduleFrame, { passive: true });
if (document.fonts) document.fonts.ready.then(scheduleFrame);

const mediaObserver = "IntersectionObserver" in window ? new IntersectionObserver((entries, observer) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    observer.unobserve(entry.target);
    setupAsset(entry.target.querySelector("img[data-src]"));
  }
}, { rootMargin: "320px" }) : null;

for (const asset of document.querySelectorAll("img[data-src]")) {
  const deferred = asset.closest("[data-defer-media]");
  if (mediaObserver && deferred) mediaObserver.observe(deferred);
  else setupAsset(asset);
}

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-revealed");
      observer.unobserve(entry.target);
    }
  }, { threshold: .07, rootMargin: "0px 0px 96px" });
  for (const element of document.querySelectorAll(".benefit-card, .product-card, .domain-copy, .process-grid, .trade-steps, .faq-list")) {
    if (element.getBoundingClientRect().top <= window.innerHeight) continue;
    element.classList.add("reveal-pending");
    revealObserver.observe(element);
  }
}

setLanguage(language);

const cartonZoom = document.querySelector(".carton-zoom");
const cartonDialog = document.querySelector(".carton-dialog");
const cartonImage = document.querySelector(".carton-art img");
cartonImage.addEventListener("load", () => { cartonZoom.hidden = false; });
cartonZoom.addEventListener("click", () => {
  cartonDialog.querySelector("img").src = cartonImage.currentSrc;
  cartonDialog.showModal();
});
