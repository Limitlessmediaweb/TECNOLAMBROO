"use client";

import Image from "next/image";
import NextLink from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowRight, Play, RotateCcw } from "lucide-react";
import { loadGsap, MQ } from "@/lib/motion";
import { CHAPTER_EDGES, L, PANEL_WINDOWS, chapterOfP, clamp01, sOfP, sstep } from "@/lib/journey/path";
import type { JourneyScene } from "@/lib/journey/scene";
import "./journey.css";

export type JourneyText = Record<
  | "aria" | "scroll" | "skip" | "hudTitle" | "signal"
  | "c1" | "c2" | "c3" | "c4" | "c5" | "c6" | "c7"
  | "heroEyebrow" | "heroTitle" | "heroText" | "fact1k" | "fact1v" | "fact2k" | "fact2v" | "fact3k" | "fact3v" | "iso" | "heroPhotoAlt"
  | "enterTitle" | "enterText" | "enterLegend" | "rigidTitle" | "rigidText"
  | "bendTitle" | "bendText" | "bendPhotoAlt" | "bendPhotoCap" | "twistTitle" | "twistText"
  | "flexTitle" | "flexText" | "videoSoon" | "videoSoonCap" | "videoSoonAlt"
  | "chainTitle" | "chainText" | "chainPhotoAlt" | "chainPhotoCap"
  | "finalTitle" | "finalText" | "ctaConfig" | "ctaQuote" | "ctaNote" | "skipIntro" | "replayIntro" | "logoAlt",
  string
>;

type Props = { t: JourneyText; shopHref: string; quoteHref: string };

/** Capitolo (0..6) di ogni pannello di testo: la flessibile e la catena montata stanno nello stesso capitolo */
const PANEL_CHAPTER = [0, 1, 2, 3, 4, 5, 5, 6];
const two = (n: number) => String(n).padStart(2, "0");

/** Scelta «Salta intro» salvata nel browser: chi torna parte già dopo il percorso */
const SKIP_KEY = "tl-intro-skip";
const readSkip = () => {
  try {
    return localStorage.getItem(SKIP_KEY) === "1";
  } catch {
    return false;
  }
};
const writeSkip = (on: boolean) => {
  try {
    if (on) localStorage.setItem(SKIP_KEY, "1");
    else localStorage.removeItem(SKIP_KEY);
  } catch {
    // archiviazione bloccata (navigazione privata): la scelta vale solo per questa visita
  }
};

/**
 * Home «Il viaggio del segnale». Tre modi, scelti dopo l'idratazione (data-mode sulla sezione):
 *  - live: scena 3D fissata allo schermo, camera guidata dallo scroll (GSAP ScrollTrigger);
 *  - calm: prefers-reduced-motion, capitoli fermi con il pezzo che ruota piano;
 *  - static: senza WebGL (o senza JavaScript) i capitoli sono una pagina normale con le foto vere.
 */
export function SignalJourney({ t, shopHref, quoteHref }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  /** salto al fondo del percorso e ritorno all'inizio, collegati alla scena dopo il montaggio */
  const jump = useRef<{ toEnd: (save: boolean) => void; toStart: () => void }>({ toEnd: () => {}, toStart: () => {} });
  // Contenitore del tasto «Salta intro» come primo figlio di <body>: è il primo elemento raggiungibile con Tab.
  const [skipHost, setSkipHost] = useState<HTMLElement | null>(null);
  /** partenza già dopo il percorso: decisa una volta sola all'arrivo sulla pagina */
  const startAfterRef = useRef<boolean | null>(null);
  const chapters = [t.c1, t.c2, t.c3, t.c4, t.c5, t.c6, t.c7];

  // Prima del primo paint: scelta del modo e header scuro sopra la scena.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let webgl = false;
    try {
      webgl = Boolean(document.createElement("canvas").getContext("webgl2"));
    } catch {
      webgl = false;
    }
    root.dataset.mode = !webgl ? "static" : window.matchMedia(MQ.reduce).matches ? "calm" : "live";
    const html = document.documentElement;
    html.dataset.sjHeader = "on";
    // Questa home non ha l'intro: lo scroll parte subito.
    delete html.dataset.intro;
    window.dispatchEvent(new Event("tl:intro-end"));
    const host = document.createElement("div");
    host.className = "sj-skip-host";
    document.body.prepend(host);
    setSkipHost(host);
    return () => {
      delete html.dataset.sjHeader;
      host.remove();
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const html = document.documentElement;
    const mode = root.dataset.mode;
    const stage = root.querySelector<HTMLElement>("[data-sj-stage]")!;
    const panels = Array.from(root.querySelectorAll<HTMLElement>("[data-sj-panel]"));
    const links = panels.map((el) => Array.from(el.querySelectorAll<HTMLAnchorElement>("a")));
    const hudItems = Array.from(root.querySelectorAll<HTMLElement>("[data-sj-tick]"));
    const hudName = root.querySelector<HTMLElement>("[data-sj-name]");
    const hudNum = root.querySelector<HTMLElement>("[data-sj-num]");
    const hudMm = root.querySelector<HTMLElement>("[data-sj-mm]");
    const hudBar = root.querySelector<HTMLElement>("[data-sj-bar]");
    const hint = root.querySelector<HTMLElement>("[data-sj-hint]");

    // Header scuro finché la scena è sullo schermo, poi torna quello del tema.
    const finalPanel = panels[panels.length - 1];
    const syncHeader = () => {
      const r = root.getBoundingClientRect();
      const on = r.bottom > 72;
      if (on !== (html.dataset.sjHeader === "on")) {
        if (on) html.dataset.sjHeader = "on";
        else delete html.dataset.sjHeader;
      }
      // «Salta intro» resta visibile per tutto il percorso; al finale lascia il posto a «Rivedi intro»
      const end =
        root.dataset.mode === "static" ? finalPanel.getBoundingClientRect().top < window.innerHeight * 0.5 : r.bottom <= window.innerHeight + 8;
      if (end !== (root.dataset.sjEnd === "1")) {
        if (end) root.dataset.sjEnd = "1";
        else delete root.dataset.sjEnd;
      }
      if (r.top > -4 && root.dataset.sjSkipped) delete root.dataset.sjSkipped;
    };
    window.addEventListener("scroll", syncHeader, { passive: true });
    syncHeader();

    // Salto al fondo del percorso (o di nuovo all'inizio): la scena si oscura un attimo, la pagina
    // si sposta di colpo e l'animazione legata allo scroll viene portata subito al punto giusto,
    // così non resta niente a metà.
    let finish: ((p: number) => void) | null = null;
    let fadeTimer = 0;
    // Dopo un salto al finale la pagina resta agganciata lì se l'altezza cambia (foto, font, modo
    // della scena), finché il visitatore non scorre da sé.
    let pinEnd = false;
    const endTop = () =>
      root.dataset.mode === "static" ? finalPanel.getBoundingClientRect().top + window.scrollY - 72 : root.offsetTop + root.offsetHeight - window.innerHeight;
    const unpin = () => (pinEnd = false);
    const userInput = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    for (const ev of userInput) window.addEventListener(ev, unpin, { passive: true });
    const go = (where: "end" | "start", focus: HTMLElement | null) => {
      const live = root.dataset.mode === "live";
      const move = () => {
        window.scrollTo({ top: where === "start" ? 0 : endTop(), behavior: "instant" });
        pinEnd = where === "end";
        finish?.(where === "end" ? 1 : 0);
        syncHeader();
        delete root.dataset.sjFade;
        if (!focus) return;
        focus.focus({ preventScroll: true });
        // senza scena pronta il pannello diventa visibile solo al frame dopo: si riprova
        if (document.activeElement !== focus) window.setTimeout(() => focus.focus({ preventScroll: true }), 120);
      };
      window.clearTimeout(fadeTimer);
      if (live) {
        root.dataset.sjFade = "1";
        fadeTimer = window.setTimeout(move, 260);
      } else move();
    };
    const finalHeading = finalPanel.querySelector<HTMLElement>("h2");
    jump.current = {
      toEnd: (save) => {
        if (save) writeSkip(true);
        go("end", finalHeading);
        root.dataset.sjSkipped = "1";
      },
      toStart: () => {
        writeSkip(false);
        delete root.dataset.sjSkipped;
        go("start", skipRef.current);
      },
    };
    // Esc salta l'intro finché si è nel percorso (non quando un menu o una finestra lo usano già)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || root.dataset.sjEnd === "1") return;
      if (document.querySelector('[aria-modal="true"], dialog[open]') || root.getBoundingClientRect().bottom < 72) return;
      jump.current.toEnd(true);
    };
    window.addEventListener("keydown", onKey);
    // l'altezza della scena arriva dal CSS del modo scelto: ricalcola quando cambia
    const sizeWatch = new ResizeObserver(() => {
      if (pinEnd && Math.abs(window.scrollY - endTop()) > 2) {
        window.scrollTo({ top: endTop(), behavior: "instant" });
        finish?.(1);
      }
      syncHeader();
    });
    sizeWatch.observe(root);
    // Visitatore di ritorno o prefers-reduced-motion: la pagina parte già dopo il percorso
    // (non se arriva con un'ancora o con la pagina già scorsa, es. tasto Indietro).
    startAfterRef.current ??= (readSkip() || window.matchMedia(MQ.reduce).matches) && !location.hash && window.scrollY < 4;
    const startAfter = startAfterRef.current;
    if (startAfter) {
      window.scrollTo({ top: endTop(), behavior: "instant" });
      pinEnd = true;
      root.dataset.sjSkipped = "1";
      syncHeader();
    }
    const cleanBase = () => {
      window.removeEventListener("scroll", syncHeader);
      window.removeEventListener("keydown", onKey);
      for (const ev of userInput) window.removeEventListener(ev, unpin);
      sizeWatch.disconnect();
      window.clearTimeout(fadeTimer);
    };

    if (mode === "static") return cleanBase;

    let disposed = false;
    let scene: JourneyScene | null = null;
    let raf = 0;
    let visible = true;
    let revert: (() => void) | null = null;
    const state = { p: 0 };
    const calm = mode === "calm";
    const scrollProgress = () => {
      const r = root.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      return span > 0 ? clamp01(-r.top / span) : 0;
    };

    const shown: number[] = panels.map(() => -1);
    let chapter = -1;
    let mm = -1;
    const setPanel = (i: number, o: number) => {
      const v = Math.round(o * 100) / 100;
      if (v === shown[i]) return;
      shown[i] = v;
      const el = panels[i];
      el.style.opacity = String(v);
      el.style.setProperty("--sj-o", String(v));
      el.style.visibility = v < 0.01 ? "hidden" : "visible";
      el.style.pointerEvents = v > 0.6 ? "auto" : "none";
      for (const a of links[i]) a.tabIndex = v > 0.6 ? 0 : -1;
    };
    const setHud = (c: number, s: number, p: number) => {
      if (c !== chapter) {
        chapter = c;
        hudItems.forEach((el, i) => el.toggleAttribute("data-on", i === c));
        if (hudName) hudName.textContent = chapters[c];
        if (hudNum) hudNum.textContent = two(c + 1);
      }
      const r = Math.round(s);
      if (r !== mm) {
        mm = r;
        if (hudMm) hudMm.textContent = `${r} mm`;
      }
      if (hudBar) hudBar.style.transform = `scaleY(${(s / L).toFixed(4)})`;
      if (hint) hint.style.opacity = (1 - sstep(0.01, 0.045, p)).toFixed(2);
    };
    const drawLive = (p: number) => {
      for (let i = 0; i < panels.length; i++) {
        const [a, b] = PANEL_WINDOWS[i];
        setPanel(i, sstep(a, a + 0.024, p) * (1 - sstep(b - 0.024, b, p)));
      }
      setHud(chapterOfP(p), sOfP(p), p);
      root.style.setProperty("--sj-veil", (0.55 + 0.45 * sstep(0.12, 0.2, p) * (1 - sstep(0.78, 0.86, p))).toFixed(2));
    };
    const drawCalm = (panel: number) => {
      for (let i = 0; i < panels.length; i++) setPanel(i, i === panel ? 1 : 0);
      const c = PANEL_CHAPTER[panel];
      setHud(c, c === 0 ? 0 : sOfP(c >= 6 ? 1 : CHAPTER_EDGES[c - 1] + 0.05), panel === 0 ? 0 : 1);
    };

    const start = async () => {
      try {
        const mod = await import("@/lib/journey/scene");
        if (disposed) return;
        scene = mod.createJourneyScene(canvas, { compact: Math.min(window.innerWidth, window.innerHeight) < 600 });
      } catch {
        // WebGL non disponibile davvero: capitoli statici con le foto
        root.dataset.mode = "static";
        panels.forEach((el) => el.removeAttribute("style"));
        return;
      }
      const ro = new ResizeObserver(() => scene?.resize(stage.clientWidth, stage.clientHeight));
      ro.observe(stage);
      scene.resize(stage.clientWidth, stage.clientHeight);
      const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
      io.observe(root);

      let kill: (() => void) | null = null;
      if (!calm) {
        const { gsap, ScrollTrigger } = await loadGsap();
        if (disposed) return;
        state.p = scrollProgress();
        const tween = gsap.fromTo(state, { p: 0 }, { p: 1, ease: "none", scrollTrigger: { trigger: root, start: "top top", end: "bottom bottom", scrub: 0.85 } });
        ScrollTrigger.refresh();
        // dopo un salto: niente rincorsa dello scrub attraverso tutti i capitoli
        finish = (p) => {
          ScrollTrigger.update();
          tween.scrollTrigger?.getTween()?.progress(1);
          tween.progress(p);
          state.p = p;
          drawLive(p); // pannelli subito al punto giusto, senza aspettare il frame successivo
        };
        if (startAfter) finish(1);
        kill = () => {
          finish = null;
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      }

      const t0 = performance.now();
      let first = true;
      const tick = (now: number) => {
        raf = requestAnimationFrame(tick);
        if (!visible || document.hidden || !scene || window.__sjHold) return;
        window.__sjFrames = (window.__sjFrames ?? 0) + 1;
        const time = (now - t0) / 1000;
        if (calm) {
          const panel = Math.min(panels.length - 1, Math.floor(scrollProgress() * panels.length));
          scene.renderCalm(panel, time);
          drawCalm(panel);
        } else {
          const p = window.__sjSeek ?? state.p;
          scene.render(p, window.__sjTime ?? time);
          drawLive(p);
        }
        if (first) {
          first = false;
          root.dataset.ready = "1";
        }
      };
      raf = requestAnimationFrame(tick);
      revert = () => {
        ro.disconnect();
        io.disconnect();
        kill?.();
      };
    };
    void start();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanBase();
      revert?.();
      scene?.dispose();
    };
    // I testi dei capitoli cambiano solo con la lingua (nuova pagina): l'effetto parte una volta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const index = (panel: number, named = true) => (
    <p className="sj-eyebrow">
      <span className="sj-eyebrow-n">{two(PANEL_CHAPTER[panel] + 1)}</span>
      {named ? <span>{chapters[PANEL_CHAPTER[panel]]}</span> : null}
    </p>
  );

  return (
    <section ref={rootRef} className="sj" data-sj aria-label={t.aria}>
      {skipHost
        ? createPortal(
            <button ref={skipRef} type="button" className="sj-skipintro" onClick={() => jump.current.toEnd(true)} aria-keyshortcuts="Escape" data-track="intro_skip">
              {t.skipIntro}
              <ArrowDown aria-hidden="true" strokeWidth={1.75} />
            </button>,
            skipHost,
          )
        : null}
      <div className="sj-stage" data-sj-stage>
        <button type="button" className="sj-replay" onClick={() => jump.current.toStart()} data-track="intro_replay">
          <RotateCcw aria-hidden="true" strokeWidth={1.75} />
          {t.replayIntro}
        </button>
        <canvas ref={canvasRef} className="sj-canvas" aria-hidden="true" />
        <div className="sj-veil" aria-hidden="true" />

        <div className="sj-panels">
          {/* 1 · Hero */}
          <article className="sj-panel sj-panel--hero" data-sj-panel>
            <div className="sj-copy">
              <p className="sj-eyebrow">
                <span>{t.heroEyebrow}</span>
              </p>
              <h1 className="sj-title sj-title--xl">{t.heroTitle}</h1>
              <p className="sj-text">{t.heroText}</p>
              <dl className="sj-facts">
                <div>
                  <dt>{t.fact1k}</dt>
                  <dd>{t.fact1v}</dd>
                </div>
                <div>
                  <dt>{t.fact2k}</dt>
                  <dd>{t.fact2v}</dd>
                </div>
                <div>
                  <dt>{t.fact3k}</dt>
                  <dd>{t.fact3v}</dd>
                </div>
              </dl>
              <p className="sj-iso">
                <span className="sj-plate">
                  <Image src="/brand/logo.png" alt={t.logoAlt} width={541} height={197} sizes="132px" priority />
                </span>
                <span>{t.iso}</span>
                <NextLink href={shopHref} className="sj-skip" data-track="cta_shop_click" data-source="journey_hero">
                  {t.skip}
                  <ArrowRight aria-hidden="true" strokeWidth={1.75} />
                </NextLink>
              </p>
            </div>
            <figure className="sj-photo sj-photo--static">
              <Image src="/journey/flessibili.webp" alt={t.heroPhotoAlt} width={1600} height={1000} sizes="(min-width: 64rem) 46vw, 92vw" />
            </figure>
          </article>

          {/* 2 · Entrata nella flangia */}
          <article className="sj-panel" data-sj-panel>
            <div className="sj-copy">
              {index(1)}
              <h2 className="sj-title">{t.enterTitle}</h2>
              <p className="sj-text">{t.enterText}</p>
              <p className="sj-legend">
                <span className="sj-legend-mark" aria-hidden="true" />
                {t.enterLegend}
              </p>
            </div>
          </article>

          {/* 3 · Guida rigida */}
          <article className="sj-panel" data-sj-panel>
            <div className="sj-copy">
              {index(2)}
              <h2 className="sj-title">{t.rigidTitle}</h2>
              <p className="sj-text">{t.rigidText}</p>
            </div>
          </article>

          {/* 4 · Curva */}
          <article className="sj-panel" data-sj-panel>
            <div className="sj-copy">
              {index(3)}
              <h2 className="sj-title">{t.bendTitle}</h2>
              <p className="sj-text">{t.bendText}</p>
            </div>
            <figure className="sj-photo">
              <Image src="/journey/fresatura.webp" alt={t.bendPhotoAlt} width={960} height={720} sizes="(min-width: 64rem) 20rem, 9rem" />
              <figcaption>{t.bendPhotoCap}</figcaption>
            </figure>
          </article>

          {/* 5 · Twist */}
          <article className="sj-panel sj-panel--twist" data-sj-panel>
            <div className="sj-copy">
              {index(4)}
              <h2 className="sj-title sj-title--xl">{t.twistTitle}</h2>
              <p className="sj-text">{t.twistText}</p>
            </div>
          </article>

          {/* 6 · Flessibile */}
          <article className="sj-panel" data-sj-panel>
            <div className="sj-copy">
              {index(5)}
              <h2 className="sj-title">{t.flexTitle}</h2>
              <p className="sj-text">{t.flexText}</p>
            </div>
            <figure className="sj-photo sj-photo--video">
              <Image src="/journey/avvolgitrice.webp" alt={t.videoSoonAlt} width={960} height={720} sizes="(min-width: 64rem) 20rem, 9rem" />
              <span className="sj-video" aria-hidden="true">
                <Play strokeWidth={1.25} />
              </span>
              <figcaption>
                <strong>{t.videoSoon}</strong>
                {t.videoSoonCap}
              </figcaption>
            </figure>
          </article>

          {/* 6 · La catena montata */}
          <article className="sj-panel" data-sj-panel>
            <div className="sj-copy">
              {index(6, false)}
              <h2 className="sj-title">{t.chainTitle}</h2>
              <p className="sj-text">{t.chainText}</p>
            </div>
            <figure className="sj-photo">
              <Image src="/journey/collaudo.webp" alt={t.chainPhotoAlt} width={960} height={720} sizes="(min-width: 64rem) 20rem, 9rem" />
              <figcaption>{t.chainPhotoCap}</figcaption>
            </figure>
          </article>

          {/* 7 · Finale */}
          <article className="sj-panel sj-panel--final" data-sj-panel>
            <div className="sj-copy">
              {index(7)}
              <h2 className="sj-title sj-title--xl" tabIndex={-1}>
                {t.finalTitle}
              </h2>
              <p className="sj-text">{t.finalText}</p>
              <div className="sj-cta">
                <NextLink href={shopHref} className="sj-btn sj-btn--primary" data-track="cta_shop_click" data-source="journey_final">
                  {t.ctaConfig}
                  <ArrowRight aria-hidden="true" strokeWidth={1.75} />
                </NextLink>
                <NextLink href={quoteHref} className="sj-btn sj-btn--ghost" data-track="cta_quote_click" data-source="journey_final">
                  {t.ctaQuote}
                  <span className="sj-btn-note">{t.ctaNote}</span>
                </NextLink>
              </div>
            </div>
          </article>
        </div>

        {/* Indicatore del capitolo e della posizione del segnale */}
        <aside className="sj-hud" aria-hidden="true">
          <p className="sj-hud-now">
            <span data-sj-num>01</span>
            <span className="sj-hud-of">/ 07</span>
            <span className="sj-hud-name" data-sj-name>
              {chapters[0]}
            </span>
          </p>
          <ol className="sj-hud-ticks">
            {chapters.map((name, i) => (
              <li key={name} data-sj-tick data-on={i === 0 ? "" : undefined}>
                <span>{two(i + 1)}</span>
              </li>
            ))}
          </ol>
          <p className="sj-hud-signal">
            <span className="sj-hud-rail">
              <span data-sj-bar />
            </span>
            <span className="sj-hud-label">{t.signal}</span>
            <span className="sj-hud-mm" data-sj-mm>
              0 mm
            </span>
          </p>
        </aside>

        <p className="sj-hint" data-sj-hint aria-hidden="true">
          {t.scroll}
        </p>
      </div>
    </section>
  );
}

declare global {
  interface Window {
    /** Solo per screenshot e video: blocca l'avanzamento (0..1) e il tempo della scena */
    __sjSeek?: number;
    __sjTime?: number;
    __sjHold?: boolean;
    __sjFrames?: number;
  }
}
