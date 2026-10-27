#!/usr/bin/env node
/*
 * Single source of truth: index.html (el) contains the page markup with
 * data-i18n / data-i18n-html attributes AND the I18N translation dictionary
 * inside its <script>. This script reads that one file and generates the
 * per-language static builds (index.html, en/index.html, it/index.html,
 * de/index.html, fr/index.html) with the body content already rendered in
 * the correct language in the raw HTML — no JS execution required for a
 * first-time visitor or crawler to see the correct language.
 *
 * Run: node build.js
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = __dirname;
const SOURCE_FILE = path.join(ROOT, 'index.html');
const LANGS = ['el', 'en', 'it', 'de', 'fr', 'es'];
const OUTPUT_PATH = {
  el: 'index.html',
  en: 'en/index.html',
  it: 'it/index.html',
  de: 'de/index.html',
  fr: 'fr/index.html',
  es: 'es/index.html'
};

// Per-language <head> metadata (title/description/OG/Twitter). This is the
// single source of truth for meta tags going forward — edit here, not in
// the generated files.
const META = {
  el: {
    title: 'TESTA · Κατασκευαστής κλειδαριών & κυλίνδρων · Αθήνα',
    description: 'TESTA – Ι. Ρουμελιώτης & Σια Ο.Ε: βιοτεχνία κλειδαριών, κυλίνδρων και κλειδιών ασφαλείας στην Αθήνα από το 1953. Ποιότητα Made in Greece με 5 χρόνια εγγύηση.',
    ogSiteName: 'TESTA · Ι. Ρουμελιώτης & Σια Ο.Ε',
    ogTitle: 'TESTA · Ι. Ρουμελιώτης & Σια Ο.Ε — Ασφάλεια που κρατά, από το 1953',
    ogDescription: 'Βιοτεχνία κλειδαριών, κυλίνδρων και κλειδιών ασφαλείας στην Αθήνα από το 1953. Ποιότητα Made in Greece με 5 χρόνια εγγύηση.',
    ogLocale: 'el_GR',
    twitterTitle: 'TESTA · Ι. Ρουμελιώτης & Σια Ο.Ε — Ασφάλεια που κρατά, από το 1953',
    twitterDescription: 'Βιοτεχνία κλειδαριών, κυλίνδρων και κλειδιών ασφαλείας στην Αθήνα από το 1953. Ποιότητα Made in Greece με 5 χρόνια εγγύηση.'
  },
  en: {
    title: 'TESTA · Lock & Cylinder Manufacturer · Athens, Greece',
    description: 'TESTA – I. Roumeliotis & Sia O.E: lock, cylinder and security key workshop in Athens since 1953. Made in Greece quality with a 5-year warranty.',
    ogSiteName: 'TESTA · I. Roumeliotis & Sia O.E',
    ogTitle: 'TESTA · I. Roumeliotis & Sia O.E — Security that lasts, since 1953',
    ogDescription: 'Lock, cylinder and security key workshop in Athens since 1953. Made in Greece quality with a 5-year warranty.',
    ogLocale: 'en_US',
    twitterTitle: 'TESTA · I. Roumeliotis & Sia O.E — Security that lasts, since 1953',
    twitterDescription: 'Lock, cylinder and security key workshop in Athens since 1953. Made in Greece quality with a 5-year warranty.'
  },
  it: {
    title: 'TESTA · Produttore di serrature e cilindri · Atene, Grecia',
    description: 'TESTA – I. Roumeliotis & Sia O.E: officina di serrature, cilindri e chiavi di sicurezza ad Atene dal 1953. Qualità Made in Greece con 5 anni di garanzia.',
    ogSiteName: 'TESTA · I. Roumeliotis & Sia O.E',
    ogTitle: 'TESTA · I. Roumeliotis & Sia O.E — Sicurezza che dura, dal 1953',
    ogDescription: 'Officina di serrature, cilindri e chiavi di sicurezza ad Atene dal 1953. Qualità Made in Greece con 5 anni di garanzia.',
    ogLocale: 'it_IT',
    twitterTitle: 'TESTA · I. Roumeliotis & Sia O.E — Sicurezza che dura, dal 1953',
    twitterDescription: 'Officina di serrature, cilindri e chiavi di sicurezza ad Atene dal 1953. Qualità Made in Greece con 5 anni di garanzia.'
  },
  de: {
    title: 'TESTA · Schloss- und Zylinderhersteller · Athen, Griechenland',
    description: 'TESTA – I. Roumeliotis & Sia O.E: Werkstatt für Schlösser, Zylinder und Sicherheitsschlüssel in Athen seit 1953. Made in Greece Qualität mit 5 Jahren Garantie.',
    ogSiteName: 'TESTA · I. Roumeliotis & Sia O.E',
    ogTitle: 'TESTA · I. Roumeliotis & Sia O.E — Sicherheit, die hält, seit 1953',
    ogDescription: 'Werkstatt für Schlösser, Zylinder und Sicherheitsschlüssel in Athen seit 1953. Made in Greece Qualität mit 5 Jahren Garantie.',
    ogLocale: 'de_DE',
    twitterTitle: 'TESTA · I. Roumeliotis & Sia O.E — Sicherheit, die hält, seit 1953',
    twitterDescription: 'Werkstatt für Schlösser, Zylinder und Sicherheitsschlüssel in Athen seit 1953. Made in Greece Qualität mit 5 Jahren Garantie.'
  },
  fr: {
    title: 'TESTA · Fabricant de serrures et cylindres · Athènes, Grèce',
    description: 'TESTA – I. Roumeliotis & Sia O.E : atelier de serrures, cylindres et clés de sécurité à Athènes depuis 1953. Qualité Made in Greece avec 5 ans de garantie.',
    ogSiteName: 'TESTA · I. Roumeliotis & Sia O.E',
    ogTitle: 'TESTA · I. Roumeliotis & Sia O.E — Une sécurité durable, depuis 1953',
    ogDescription: 'Atelier de serrures, cylindres et clés de sécurité à Athènes depuis 1953. Qualité Made in Greece avec 5 ans de garantie.',
    ogLocale: 'fr_FR',
    twitterTitle: 'TESTA · I. Roumeliotis & Sia O.E — Une sécurité durable, depuis 1953',
    twitterDescription: 'Atelier de serrures, cylindres et clés de sécurité à Athènes depuis 1953. Qualité Made in Greece avec 5 ans de garantie.'
  },
  es: {
    title: 'TESTA · Fabricante de cerraduras y cilindros · Atenas, Grecia',
    description: 'TESTA – I. Roumeliotis & Sia O.E: taller de cerraduras, cilindros y llaves de seguridad en Atenas desde 1953. Calidad Made in Greece con 5 años de garantía.',
    ogSiteName: 'TESTA · I. Roumeliotis & Sia O.E',
    ogTitle: 'TESTA · I. Roumeliotis & Sia O.E — Seguridad que perdura, desde 1953',
    ogDescription: 'Taller de cerraduras, cilindros y llaves de seguridad en Atenas desde 1953. Calidad Made in Greece con 5 años de garantía.',
    ogLocale: 'es_ES',
    twitterTitle: 'TESTA · I. Roumeliotis & Sia O.E — Seguridad que perdura, desde 1953',
    twitterDescription: 'Taller de cerraduras, cilindros y llaves de seguridad en Atenas desde 1953. Calidad Made in Greece con 5 años de garantía.'
  }
};

function canonicalUrl(lang) {
  return lang === 'el' ? 'https://www.testa.gr/' : `https://www.testa.gr/${lang}/`;
}

function extractI18N(html) {
  const startMarker = 'var I18N = {';
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) throw new Error('I18N dictionary not found in source file');
  let i = startIdx + startMarker.length - 1; // at the opening {
  let depth = 0;
  for (; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  const objText = html.slice(startIdx + 'var I18N = '.length, i);
  // eslint-disable-next-line no-new-func
  const I18N = new Function('return (' + objText + ');')();
  return I18N;
}

function main() {
  // Strip a leading BOM: JSDOM treats it as body text, which empties <head>.
  const sourceHtml = fs.readFileSync(SOURCE_FILE, 'utf8').replace(/^﻿/, '');
  const I18N = extractI18N(sourceHtml);

  // Sanity check: every language must have a value for every key.
  const missing = [];
  for (const key of Object.keys(I18N)) {
    for (const lang of LANGS) {
      if (I18N[key][lang] == null) missing.push(`${key}.${lang}`);
    }
  }
  if (missing.length) {
    throw new Error('Missing I18N entries, aborting build: ' + missing.join(', '));
  }

  const report = [];

  for (const lang of LANGS) {
    const dom = new JSDOM(sourceHtml);
    const doc = dom.window.document;

    // <html lang="">
    doc.documentElement.setAttribute('lang', lang);

    // <title>
    const titleEl = doc.querySelector('title');
    if (titleEl) titleEl.textContent = META[lang].title;

    // meta description
    const descMeta = doc.querySelector('meta[name="description"]');
    if (descMeta) descMeta.setAttribute('content', META[lang].description);

    // canonical
    const canonical = doc.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', canonicalUrl(lang));

    // hreflang alternates — identical set on every page, just verify present
    LANGS.concat('x-default').forEach((code) => {
      const href = code === 'x-default' ? canonicalUrl('el') : canonicalUrl(code);
      const el = doc.querySelector(`link[rel="alternate"][hreflang="${code}"]`);
      if (!el) throw new Error(`[${lang}] missing hreflang alternate for ${code}`);
      el.setAttribute('href', href);
    });

    // OpenGraph / Twitter
    const setMeta = (selector, value) => {
      const el = doc.querySelector(selector);
      if (el) el.setAttribute('content', value);
    };
    setMeta('meta[property="og:site_name"]', META[lang].ogSiteName);
    setMeta('meta[property="og:title"]', META[lang].ogTitle);
    setMeta('meta[property="og:description"]', META[lang].ogDescription);
    setMeta('meta[property="og:url"]', canonicalUrl(lang));
    setMeta('meta[property="og:locale"]', META[lang].ogLocale);
    setMeta('meta[name="twitter:title"]', META[lang].twitterTitle);
    setMeta('meta[name="twitter:description"]', META[lang].twitterDescription);

    // Body content translation — this is what makes the raw HTML correct
    // without relying on JS running first.
    let textCount = 0, htmlCount = 0;
    doc.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const entry = I18N[key];
      if (entry && entry[lang] != null) {
        el.textContent = entry[lang];
        textCount++;
      }
    });
    doc.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html');
      const entry = I18N[key];
      if (entry && entry[lang] != null) {
        el.innerHTML = entry[lang];
        htmlCount++;
      }
    });
    let placeholderCount = 0;
    doc.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const entry = I18N[key];
      if (entry && entry[lang] != null) {
        el.setAttribute('placeholder', entry[lang]);
        placeholderCount++;
      }
    });
    let altCount = 0;
    doc.querySelectorAll('[data-i18n-alt]').forEach((el) => {
      const key = el.getAttribute('data-i18n-alt');
      const entry = I18N[key];
      if (entry && entry[lang] != null) {
        el.setAttribute('alt', entry[lang]);
        altCount++;
      }
    });
    let ariaCount = 0;
    doc.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria');
      const entry = I18N[key];
      if (entry && entry[lang] != null) {
        el.setAttribute('aria-label', entry[lang]);
        ariaCount++;
      }
    });
    let titleAttrCount = 0;
    doc.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      const entry = I18N[key];
      if (entry && entry[lang] != null) {
        el.setAttribute('title', entry[lang]);
        titleAttrCount++;
      }
    });

    // Language switcher initial state (is-active class + visible label)
    // matches the page's own language before any JS runs.
    const langOptions = doc.querySelectorAll('.lang-option');
    let activeLabel = null;
    langOptions.forEach((btn) => {
      const isActive = btn.getAttribute('data-lang') === lang;
      btn.classList.toggle('is-active', isActive);
      if (isActive) activeLabel = btn.textContent;
    });
    const langCurrentLabel = doc.getElementById('langCurrentLabel');
    if (langCurrentLabel && activeLabel) langCurrentLabel.textContent = activeLabel;

    // Non-root pages live one directory down — fix root-relative asset
    // paths (images/, files/) accordingly. CSS @font-face URLs already use
    // absolute "/fonts/..." paths so they need no adjustment.
    if (lang !== 'el') {
      doc.querySelectorAll('img[src^="images/"]').forEach((img) => {
        img.setAttribute('src', '../' + img.getAttribute('src'));
      });
      doc.querySelectorAll('link[href^="images/"]').forEach((link) => {
        link.setAttribute('href', '../' + link.getAttribute('href'));
      });
      doc.querySelectorAll('a[href^="files/"]').forEach((a) => {
        a.setAttribute('href', '../' + a.getAttribute('href'));
      });
    }

    // Patch the inline <script> for correct navigation base + current lang.
    const scripts = doc.querySelectorAll('script:not([src])');
    let scriptPatched = false;
    scripts.forEach((s) => {
      if (s.textContent.includes('var LANG_BASE =')) {
        s.textContent = s.textContent
          .replace(/var LANG_BASE = '[^']*';/, `var LANG_BASE = '${lang === 'el' ? '' : '../'}';`)
          .replace(/var currentLang = '[^']*';/, `var currentLang = '${lang}';`);
        scriptPatched = true;
      }
    });
    if (!scriptPatched) throw new Error(`[${lang}] could not patch LANG_BASE/currentLang in inline script`);

    const outRelPath = OUTPUT_PATH[lang];
    const outPath = path.join(ROOT, outRelPath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const serialized = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML + '\n';
    fs.writeFileSync(outPath, serialized, 'utf8');

    report.push({ lang, outRelPath, textCount, htmlCount, placeholderCount, altCount, ariaCount, titleAttrCount, canonical: canonicalUrl(lang) });
  }

  console.log(JSON.stringify(report, null, 2));
}

main();
