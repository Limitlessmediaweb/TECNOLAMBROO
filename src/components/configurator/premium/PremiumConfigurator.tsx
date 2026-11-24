"use client";

import { useEffect, useId, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import NextLink from "next/link";
import { ArrowLeft, ArrowRight, Check, Link2, Minus, Plus, RotateCcw, Star, Upload, X } from "lucide-react";
import { useClientLocale, useT } from "@/lib/client-i18n";
import { BEND_ANGLES, FINISHES, TWIST_ROTATIONS, TYPE_DEF, isFlexible, type Finish, type PartSpec, type PartType, type Plane } from "@/data/configurator/types";
import { defaultSpec, specFromParams, specToParams } from "@/data/configurator/defaults";
import { FREE_LENGTH, SEAMLESS_TABLE, SIZES, SIZE_BY_WR, bestSizeFor, isOnRequest, num, range, sizesFor, standardLengths } from "@/data/waveguides";
import { OTHER_FLANGE, flangeFits, flangeLabel, flangeOutline, flangesFor, type FlangeDef } from "@/data/flanges";
import { specValid } from "@/lib/part";
import { addItem } from "@/lib/request";
import { saveItemFiles } from "@/lib/request-files";
import { ACCEPTED_EXTENSIONS, MAX_FILE_BYTES, formatBytes, isAcceptedFile } from "@/lib/quote";
import { track } from "@/lib/analytics";
import { decimalSep } from "@/i18n/locales";
import { cn } from "@/lib/cn";
import type { ViewFocus, ViewerLabels } from "@/lib/part3d";
import { usePartText } from "../Configurator";
import { FlangeIcon } from "./FlangeIcon";
import { Stage3D } from "./Stage3D";

/** I 7 passi, nell'ordine. */
const STEPS = ["type", "size", "flange1", "flange2", "length", "finish", "final"] as const;
type StepId = (typeof STEPS)[number];

/** Le scelte del passo 1: la curva è divisa in piano E e piano H. */
const TILES = [
  { key: "twistable", type: "twistable" },
  { key: "seamless", type: "seamless" },
  { key: "bendE", type: "bend", plane: "E" },
  { key: "bendH", type: "bend", plane: "H" },
  { key: "twist", type: "twist" },
  { key: "offset", type: "offset" },
] as const satisfies readonly { key: string; type: PartType; plane?: Plane }[];
type TileKey = (typeof TILES)[number]["key"];

/** Colore del campione di ogni finitura (lo stesso metallo del modello 3D). */
const SWATCH: Record<Finish, string> = {
  bright: "linear-gradient(135deg,#f3dc9a,#c9a24a 55%,#8f6f2a)",
  silver: "linear-gradient(135deg,#ffffff,#d9d9d5 55%,#9a9a96)",
  painted: "linear-gradient(135deg,#465264,#2b3442 60%,#1a202a)",
  surtec: "linear-gradient(135deg,#eef2f5,#c5ccd2 55%,#8e979f)",
  raw: "linear-gradient(135deg,#d2ad74,#b08a52 55%,#7a5c33)",
};

/** Limiti geometrici: sotto o sopra questi il pezzo non si può costruire così (si passa da "su disegno"). */
const LIMITS = { rigidLength: { min: 40, max: 2000 }, leg: { min: 20, max: 1500 }, offset: { min: 1, max: 300 } } as const;

/** La misura è disponibile per il tipo? (la seamless non si fa in WR-34 e WR-159: in tabella sono "su richiesta") */
function sizeAllowed(type: PartType, wr: string): boolean {
  if (type !== "seamless") return true;
  const row = SEAMLESS_TABLE.find((r) => r.wr === wr);
  return !row || !isOnRequest(row);
}

function tileOf(spec: PartSpec): TileKey {
  if (spec.type === "bend") return spec.plane === "H" ? "bendH" : "bendE";
  return spec.type === "custom" ? "twistable" : spec.type;
}

/** Disegnino del tipo di pezzo per le scelte del passo 1. */
function TypeGlyph({ tile }: { tile: TileKey }) {
  const flange = (x: number, y: number, vertical = true) => (vertical ? <rect x={x - 1.5} y={y - 9} width="3" height="18" rx="0.8" fill="currentColor" /> : <rect x={x - 9} y={y - 1.5} width="18" height="3" rx="0.8" fill="currentColor" />);
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 64 40" className="h-10 w-16" aria-hidden="true" focusable="false">
      {tile === "twistable" || tile === "seamless" ? (
        <>
          {flange(6, 20)}
          {flange(58, 20)}
          <path {...stroke} d={tile === "twistable" ? "M8 14 C24 14 40 12 56 16 M8 26 C24 26 40 28 56 24" : "M8 14 H56 M8 26 H56"} />
          {Array.from({ length: 11 }, (_, i) => (
            <path key={i} {...stroke} strokeWidth={1} d={`M${12 + i * 4} ${tile === "twistable" ? 14.5 : 14} V${tile === "twistable" ? 25.5 : 26}`} />
          ))}
        </>
      ) : null}
      {tile === "bendE" ? (
        <>
          {flange(6, 30)}
          {flange(50, 5, false)}
          <path {...stroke} d="M8 25 H30 Q45 25 45 10 V7 M8 35 H34 Q55 35 55 14 V7" />
        </>
      ) : null}
      {tile === "bendH" ? (
        <>
          {flange(6, 28)}
          {flange(58, 12)}
          <path {...stroke} d="M8 24 H22 Q34 24 38 16 Q42 8 56 8 M8 32 H26 Q38 32 42 24 Q46 16 56 16" />
        </>
      ) : null}
      {tile === "twist" ? (
        <>
          {flange(6, 20)}
          {flange(58, 20, false)}
          <path {...stroke} d="M8 12 C28 12 36 19 56 19 M8 28 C28 28 36 21 56 21 M8 20 H56" />
        </>
      ) : null}
      {tile === "offset" ? (
        <>
          {flange(6, 28)}
          {flange(58, 12)}
          <path {...stroke} d="M8 23 C30 23 34 7 56 7 M8 33 C30 33 34 17 56 17" />
        </>
      ) : null}
    </svg>
  );
}

export function PremiumConfigurator({ requestPath }: { requestPath: string }) {
  const t = useT("premium");
  const locale = useClientLocale();
  const uid = useId();
  const text = usePartText();
  const root = useRef<HTMLDivElement>(null);

  const [spec, setSpecState] = useState<PartSpec>(() => ({ ...defaultSpec("twistable"), length: 300, finish: "bright" }));
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [same, setSame] = useState(true);
  const [freq, setFreq] = useState("");
  const [freeLength, setFreeLength] = useState(false);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);
  /** l'utente ha toccato qualcosa: da qui la configurazione va nell'indirizzo */
  const [dirty, setDirty] = useState(false);
  const loaded = useRef(false);

  const setSpec = (next: PartSpec | ((s: PartSpec) => PartSpec)) => {
    setSpecState(next);
    setAdded(false);
    setDirty(true);
  };
  useEffect(() => {
    if (dirty) track("config_start");
  }, [dirty]);
  const patch = (p: Partial<PartSpec>) => setSpec((s) => ({ ...s, ...p }));

  // configurazione dal link condiviso (?tipo=…&wr=…)
  useEffect(() => {
    const id = window.setTimeout(() => {
      loaded.current = true;
      const fromUrl = specFromParams(new URLSearchParams(window.location.search));
      if (!fromUrl || fromUrl.type === "custom") return;
      const wr = sizeAllowed(fromUrl.type, fromUrl.wr) ? fromUrl.wr : "WR-90";
      const rec = flangesFor(wr)[0]?.id ?? OTHER_FLANGE;
      const f1 = flangeFits(fromUrl.f1, wr) ? fromUrl.f1 : rec;
      const f2 = flangeFits(fromUrl.f2, wr) ? fromUrl.f2 : f1;
      setSpecState({ ...fromUrl, wr, f1, f2 });
      setSame(f1 === f2);
      setReached(STEPS.length - 1);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);
  // la configurazione resta nell'indirizzo: si può copiare e mandare a un collega
  useEffect(() => {
    if (!loaded.current || !dirty) return;
    const id = window.setTimeout(() => window.history.replaceState(window.history.state, "", `${window.location.pathname}?${specToParams(spec)}`), 250);
    return () => window.clearTimeout(id);
  }, [spec, dirty]);

  const size = SIZE_BY_WR.get(spec.wr) ?? SIZE_BY_WR.get("WR-90")!;
  const flanges = useMemo(() => flangesFor(size.wr), [size.wr]);
  const geo = TYPE_DEF[spec.type].geometry;
  const flex = isFlexible(spec.type);
  const tile = tileOf(spec);
  const code = text.reference(spec);
  const id = STEPS[step];
  const mm = (v: number) => num(v, locale, 0, 2);
  const flangeName = (fid: string) => (fid === OTHER_FLANGE ? t("flange.other") : flangeLabel(fid));

  /* ------------------------------------------------------------- scelte */
  const chooseTile = (k: (typeof TILES)[number]) => {
    setSpec((s) => {
      const wr = s.wr !== "unknown" && sizeAllowed(k.type, s.wr) ? s.wr : "WR-90";
      const next = defaultSpec(k.type, wr);
      if (flangeFits(s.f1, wr)) next.f1 = s.f1;
      next.f2 = flangeFits(s.f2, wr) ? s.f2 : next.f1;
      next.finish = s.finish;
      if ("plane" in k) next.plane = k.plane;
      if (isFlexible(k.type) && s.jacket) next.jacket = 1;
      if (isFlexible(k.type) && isFlexible(s.type) && s.length) next.length = s.length;
      return next;
    });
    track("config_type", { type: k.key });
  };
  const chooseSize = (wr: string) => {
    if (!sizeAllowed(spec.type, wr)) return;
    setSpec((s) => {
      const rec = flangesFor(wr)[0]?.id ?? OTHER_FLANGE;
      const f1 = flangeFits(s.f1, wr) ? s.f1 : rec;
      return { ...s, wr, f1, f2: same ? f1 : flangeFits(s.f2, wr) ? s.f2 : rec };
    });
  };
  const chooseFlange = (which: 1 | 2, fid: string) => {
    if (which === 1) patch(same ? { f1: fid, f2: fid } : { f1: fid });
    else patch({ f2: fid });
  };

  // frequenza → misura consigliata (in evidenza)
  const freqNum = Number(freq.replace(",", "."));
  const freqValid = freq.trim() !== "" && Number.isFinite(freqNum) && freqNum > 0;
  const suggested = freqValid ? bestSizeFor(freqNum) : undefined;
  const covering = freqValid ? new Set(sizesFor(freqNum).map((s) => s.wr)) : null;

  /* --------------------------------------------------------- validità */
  const inRange = (v: number | null | undefined, r: { min: number; max: number }) => typeof v === "number" && Number.isFinite(v) && v >= r.min && v <= r.max;
  const lengthRange = flex ? FREE_LENGTH : LIMITS.rigidLength;
  const lengthOk =
    geo === "length"
      ? inRange(spec.length, lengthRange)
      : geo === "bend"
        ? inRange(spec.angle, { min: 1, max: 180 }) && inRange(spec.leg1, LIMITS.leg) && inRange(spec.leg2, LIMITS.leg)
        : geo === "twist"
          ? inRange(spec.rotation, { min: 1, max: 360 }) && inRange(spec.length, lengthRange)
          : inRange(spec.offset, LIMITS.offset) && inRange(spec.length, lengthRange) && (spec.length ?? 0) >= (spec.offset ?? 0) * 1.5;
  const stepOk: Record<StepId, boolean> = {
    type: true,
    size: sizeAllowed(spec.type, spec.wr),
    flange1: flangeFits(spec.f1, spec.wr),
    flange2: flangeFits(spec.f2, spec.wr),
    length: lengthOk && specValid(spec),
    finish: true,
    final: qty >= 1,
  };
  const allOk = STEPS.every((s) => stepOk[s]);

  const go = (n: number) => {
    const next = Math.max(0, Math.min(STEPS.length - 1, n));
    setStep(next);
    setReached((r) => Math.max(r, next));
    track("config_step", { step: STEPS[next] });
    // su telefono il pannello dei passi torna in vista
    if (window.matchMedia("(max-width: 1023px)").matches) root.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };

  /* ------------------------------------------------------------- 3D */
  const focus: ViewFocus = id === "flange1" ? "f1" : id === "flange2" ? "f2" : "all";
  const f1Name = flangeName(spec.f1);
  const f2Name = flangeName(spec.f2);
  const jacketLabel = flex ? (spec.jacket ? t("stage.jacket") : t("stage.jacketOpt")) : undefined;
  const bodyLabel = flex ? t("stage.bodyFlex") : t("stage.body");
  const f1Tag = t("stage.flange1");
  const f2Tag = t("stage.flange2");
  const labels: ViewerLabels = useMemo(() => ({ flange1: f1Tag, flange2: f2Tag, f1: f1Name, f2: f2Name, body: bodyLabel, jacket: jacketLabel }), [f1Tag, f2Tag, f1Name, f2Name, bodyLabel, jacketLabel]);

  /* ------------------------------------------------------------- file */
  const addFiles = (list: FileList) => {
    const ok: File[] = [];
    const errs: string[] = [];
    for (const f of Array.from(list)) {
      if (!isAcceptedFile(f)) errs.push(t("final.fileType", { name: f.name }));
      else if (f.size > MAX_FILE_BYTES) errs.push(t("final.fileSize", { name: f.name }));
      else if (!files.some((p) => p.name === f.name && p.size === f.size)) ok.push(f);
    }
    setFiles([...files, ...ok].slice(0, 10));
    setFileErrors(errs);
    setAdded(false);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  /* ----------------------------------------------------------- azioni */
  const add = async () => {
    if (!allOk) return;
    const detail = `${text.detail(spec)}${flex ? ` · ${spec.jacket ? t("finish.jacketOn") : t("finish.jacketOff")}` : ""}`;
    // con allegati o note la riga resta separata (i file sono di questo pezzo)
    const itemId = addItem({ kind: "configured", spec, code, detail, qty, notes: notes.trim() || (files.length ? t("final.attached", { n: files.length }) : undefined) });
    if (files.length) {
      await saveItemFiles(itemId, files);
      track("quote_3d_upload", { source: "premium_configurator", files: files.length });
    }
    setAdded(true);
    track("request_add", { kind: "configured", type: spec.type, size: spec.wr, source: "premium" });
  };
  const again = () => {
    setAdded(false);
    setFiles([]);
    setNotes("");
    setQty(1);
    setStep(0);
    root.current?.scrollIntoView({ block: "start" });
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?${specToParams(spec)}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
      track("config_share", { channel: "link" });
    } catch {
      // appunti non disponibili
    }
  };

  /* ------------------------------------------------------------ pezzi UI */
  const card = (on: boolean, disabled = false) =>
    cn(
      "relative flex w-full cursor-pointer items-center gap-4 border p-4 text-left transition-[border-color,background-color,box-shadow] duration-200",
      on ? "border-accent bg-[color-mix(in_srgb,var(--c-accent)_8%,var(--c-surface))] shadow-[0_0_0_1px_var(--c-accent)]" : "border-line bg-surface hover:border-line-strong",
      disabled && "cursor-not-allowed opacity-45 hover:border-line",
    );
  const dot = (on: boolean) => (
    <span aria-hidden="true" className={cn("ml-auto grid size-5 shrink-0 place-items-center rounded-full border", on ? "border-accent bg-accent text-on-accent" : "border-line-strong")}>
      {on ? <Check className="size-3" strokeWidth={3} /> : null}
    </span>
  );
  const pill = (on: boolean) => cn("min-h-11 rounded-full border px-4 text-sm tabular transition-colors", on ? "border-accent bg-accent text-on-accent" : "border-line-strong bg-surface hover:border-accent");
  const badge = (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-on-accent">
      <Star aria-hidden="true" className="size-3" strokeWidth={2} fill="currentColor" />
      {t("flange.recommended")}
    </span>
  );
  const numberField = (key: "length" | "leg1" | "leg2" | "offset" | "angle" | "rotation", label: string, r: { min: number; max: number }, unit = "mm") => {
    const value = spec[key];
    const bad = !inRange(value, r);
    return (
      <div className="field">
        <label htmlFor={`${uid}-${key}`} className="field-label">
          {label}
        </label>
        <div className="relative">
          <input
            id={`${uid}-${key}`}
            type="number"
            inputMode="decimal"
            min={r.min}
            max={r.max}
            step="any"
            className="input pr-12 tabular"
            value={value ?? ""}
            onChange={(e) => patch({ [key]: e.target.value === "" ? undefined : Number(e.target.value) } as Partial<PartSpec>)}
            aria-invalid={bad ? true : undefined}
            aria-describedby={`${uid}-${key}-hint`}
            data-field={key}
          />
          <span aria-hidden="true" className="annot pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
            {unit}
          </span>
        </div>
        <p id={`${uid}-${key}-hint`} className={bad ? "field-error" : "field-hint"}>
          {t("length.range", { min: mm(r.min), max: mm(r.max), unit })}
        </p>
      </div>
    );
  };

  const flangeDesc = (f: FlangeDef) => {
    const { w, h } = flangeOutline(f);
    return f.shape === "round" ? t("flange.descRound", { w: mm(w), n: f.holes, c: mm(f.C) }) : t("flange.desc", { w: mm(w), h: mm(h), n: f.holes, d: mm(f.hole), c: mm(f.C) });
  };
  const flangeList = (which: 1 | 2) => {
    const value = which === 1 ? spec.f1 : spec.f2;
    return (
      <div role="radiogroup" aria-label={t(`steps.flange${which}`)} className="grid gap-2.5">
        {flanges.map((f) => (
          <button key={f.id} type="button" role="radio" aria-checked={value === f.id} onClick={() => chooseFlange(which, f.id)} className={card(value === f.id)} data-flange={f.id}>
            <FlangeIcon flange={f} a={size.a} b={size.b} className="size-14 shrink-0" />
            <span className="grid min-w-0 gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold leading-tight">
                  {t(`flange.styles.${f.style}`)} {t(`flange.shapes.${f.shape}`)}
                </span>
                {f.rec ? badge : null}
              </span>
              <span className="font-mono text-[0.8125rem] font-medium text-primary-ink">{f.label}</span>
              <span className="text-xs text-muted">{flangeDesc(f)}</span>
            </span>
            {dot(value === f.id)}
          </button>
        ))}
        <button type="button" role="radio" aria-checked={value === OTHER_FLANGE} onClick={() => chooseFlange(which, OTHER_FLANGE)} className={card(value === OTHER_FLANGE)} data-flange={OTHER_FLANGE}>
          <span className="grid gap-1">
            <span className="font-semibold leading-tight">{t("flange.other")}</span>
            <span className="text-xs text-muted">{t("flange.otherHint")}</span>
          </span>
          {dot(value === OTHER_FLANGE)}
        </button>
        <p className="annot text-muted">{t("flange.source", { size: `${size.wr} (${size.iec})` })}</p>
      </div>
    );
  };

  /* --------------------------------------------------------------- passi */
  const lengths = standardLengths(spec.wr);
  const isFree = freeLength || (geo === "length" && !lengths.includes(spec.length ?? 0));
  const body: Record<StepId, ReactNode> = {
    type: (
      <div role="radiogroup" aria-label={t("steps.type")} className="grid gap-2.5 sm:grid-cols-2">
        {TILES.map((k) => (
          <button key={k.key} type="button" role="radio" aria-checked={tile === k.key} onClick={() => chooseTile(k)} className={cn(card(tile === k.key), "text-primary-ink")} data-tile={k.key}>
            <TypeGlyph tile={k.key} />
            <span className="grid gap-0.5 text-fg">
              <span className="font-semibold leading-tight">{t(`types.${k.key}.name`)}</span>
              <span className="text-xs text-muted">{t(`types.${k.key}.short`)}</span>
            </span>
          </button>
        ))}
      </div>
    ),
    size: (
      <>
        <div className="field max-w-xs">
          <label htmlFor={`${uid}-freq`} className="field-label">
            {t("size.freqLabel")}
          </label>
          <input id={`${uid}-freq`} inputMode="decimal" autoComplete="off" className="input tabular" value={freq} onChange={(e) => setFreq(e.target.value)} placeholder={t("size.freqPlaceholder", { value: `10${decimalSep(locale)}5` })} data-field="ghz" />
        </div>
        {freqValid ? (
          <p aria-live="polite" className="text-sm text-primary-ink">
            {suggested ? t("size.suggested", { freq: mm(freqNum), size: suggested.wr }) : t("size.none", { freq: mm(freqNum) })}
          </p>
        ) : null}
        <div role="radiogroup" aria-label={t("steps.size")} className="grid grid-cols-2 gap-2.5">
          {SIZES.map((s) => {
            const allowed = sizeAllowed(spec.type, s.wr);
            const typical = flangesFor(s.wr).filter((f) => f.rec).map((f) => f.label).join(" · ");
            const hot = suggested?.wr === s.wr;
            return (
              <button
                key={s.wr}
                type="button"
                role="radio"
                aria-checked={spec.wr === s.wr}
                aria-disabled={!allowed}
                disabled={!allowed}
                onClick={() => chooseSize(s.wr)}
                className={cn(card(spec.wr === s.wr, !allowed), "flex-col items-start gap-1", covering?.has(s.wr) && allowed && "ring-2 ring-accent/35")}
                data-size={s.wr}
              >
                <span className="flex w-full items-center gap-2">
                  <span className="font-display text-lg font-bold wdth-wide">{s.wr.replace("-", "")}</span>
                  {hot ? badge : null}
                </span>
                <span className="annot tabular text-muted">
                  {mm(s.a)} × {mm(s.b)} mm
                </span>
                <span className="annot tabular text-primary-ink">{range(s.min, s.max, locale)} GHz</span>
                <span className="annot text-muted">{allowed ? typical : t("size.onRequest")}</span>
              </button>
            );
          })}
        </div>
      </>
    ),
    flange1: flangeList(1),
    flange2: (
      <>
        <label className={cn(card(same), "cursor-pointer")}>
          <input
            type="checkbox"
            className="size-5 shrink-0 accent-[var(--c-accent)]"
            checked={same}
            onChange={(e) => {
              setSame(e.target.checked);
              if (e.target.checked) patch({ f2: spec.f1 });
            }}
            data-same-flange
          />
          <span className="grid gap-0.5">
            <span className="font-semibold leading-tight">{t("flange.same")}</span>
            <span className="font-mono text-[0.8125rem] text-primary-ink">{f1Name}</span>
          </span>
        </label>
        {same ? null : flangeList(2)}
      </>
    ),
    length: (
      <>
        {geo === "length" ? (
          <>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("length.label")}>
              {lengths.map((p) => (
                <button key={p} type="button" aria-pressed={!isFree && spec.length === p} onClick={() => (setFreeLength(false), patch({ length: p }))} className={pill(!isFree && spec.length === p)} data-length={p}>
                  {p} mm
                </button>
              ))}
              <button type="button" aria-pressed={isFree} onClick={() => setFreeLength(true)} className={pill(isFree)} data-length="other">
                {t("length.other")}
              </button>
            </div>
            {isFree ? (
              <>
                <input
                  type="range"
                  min={FREE_LENGTH.min}
                  max={FREE_LENGTH.max}
                  step={10}
                  value={spec.length ?? 600}
                  onChange={(e) => patch({ length: Number(e.target.value) })}
                  aria-label={t("length.label")}
                  className="w-full accent-[var(--c-accent)]"
                />
                <div className="max-w-xs">{numberField("length", t("length.label"), FREE_LENGTH)}</div>
                <p className="text-sm text-primary-ink">{t("length.outStd")}</p>
              </>
            ) : null}
          </>
        ) : null}
        {geo === "bend" ? (
          <>
            <div className="grid gap-2">
              <p className="field-label">{t("length.angle")}</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t("length.angle")}>
                {BEND_ANGLES.map((a) => (
                  <button key={a} type="button" aria-pressed={spec.angle === a} onClick={() => patch({ angle: a })} className={pill(spec.angle === a)}>
                    {a}°
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {numberField("leg1", t("length.leg1"), LIMITS.leg)}
              {numberField("leg2", t("length.leg2"), LIMITS.leg)}
            </div>
            <p className="annot text-muted">{t("length.radiusNote")}</p>
          </>
        ) : null}
        {geo === "twist" ? (
          <>
            <div className="grid gap-2">
              <p className="field-label">{t("length.rotation")}</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t("length.rotation")}>
                {TWIST_ROTATIONS.map((a) => (
                  <button key={a} type="button" aria-pressed={spec.rotation === a} onClick={() => patch({ rotation: a })} className={pill(spec.rotation === a)}>
                    {a}°
                  </button>
                ))}
                {(["cw", "ccw"] as const).map((d) => (
                  <button key={d} type="button" aria-pressed={spec.direction === d} onClick={() => patch({ direction: d })} className={pill(spec.direction === d)}>
                    {t(`length.${d}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-w-xs">{numberField("length", t("length.label"), LIMITS.rigidLength)}</div>
          </>
        ) : null}
        {geo === "offset" ? (
          <>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("length.plane")}>
              {(["E", "H"] as const).map((pl) => (
                <button key={pl} type="button" role="radio" aria-checked={spec.plane === pl} onClick={() => patch({ plane: pl })} className={pill(spec.plane === pl)}>
                  {t(`length.plane${pl}`)}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {numberField("offset", t("length.offset"), LIMITS.offset)}
              {numberField("length", t("length.label"), LIMITS.rigidLength)}
            </div>
            {(spec.length ?? 0) < (spec.offset ?? 0) * 1.5 ? <p className="field-error">{t("length.offsetTooShort")}</p> : null}
          </>
        ) : null}
      </>
    ),
    finish: (
      <>
        <div role="radiogroup" aria-label={t("steps.finish")} className="grid gap-2.5">
          {FINISHES.map((f) => (
            <button key={f} type="button" role="radio" aria-checked={spec.finish === f} onClick={() => patch({ finish: f })} className={card(spec.finish === f)} data-finish={f}>
              <span aria-hidden="true" className="size-10 shrink-0 rounded-full border border-line-strong shadow-inner" style={{ background: SWATCH[f] }} />
              <span className="grid gap-0.5">
                <span className="font-semibold leading-tight">{t(`finish.${f}.name`)}</span>
                <span className="text-xs text-muted">{t(`finish.${f}.note`)}</span>
              </span>
              {dot(spec.finish === f)}
            </button>
          ))}
        </div>
        {flex ? (
          <div className="grid gap-2">
            <p className="field-label">{t("finish.jacket")}</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("finish.jacket")}>
              <button type="button" role="radio" aria-checked={!spec.jacket} onClick={() => patch({ jacket: 0 })} className={pill(!spec.jacket)} data-jacket="off">
                {t("finish.jacketOff")}
              </button>
              <button type="button" role="radio" aria-checked={Boolean(spec.jacket)} onClick={() => patch({ jacket: 1 })} className={pill(Boolean(spec.jacket))} data-jacket="on">
                {t("finish.jacketOn")}
              </button>
            </div>
          </div>
        ) : null}
      </>
    ),
    final: (
      <>
        <div className="field">
          <label htmlFor={`${uid}-qty`} className="field-label">
            {t("final.qty")}
          </label>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => (setQty(Math.max(1, qty - 1)), setAdded(false))} aria-label={t("final.less")} disabled={qty <= 1}>
              <Minus aria-hidden="true" className="size-4" strokeWidth={2} />
            </button>
            <input id={`${uid}-qty`} type="number" inputMode="numeric" min={1} max={100000} className="input w-28 text-center tabular" value={qty} onChange={(e) => (setQty(Math.max(1, Math.floor(Number(e.target.value)) || 1)), setAdded(false))} data-field="qty" />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => (setQty(qty + 1), setAdded(false))} aria-label={t("final.more")}>
              <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
            </button>
            <span className="text-sm text-muted">{t("final.pieces")}</span>
          </div>
        </div>
        <div className="field">
          <p className="field-label" id={`${uid}-files`}>
            {t("final.files")}
          </p>
          <label
            onDragOver={(e) => (e.preventDefault(), setDragging(true))}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn("flex cursor-pointer flex-col items-center gap-2 border border-dashed p-5 text-center text-sm transition-colors", dragging ? "border-accent bg-[color-mix(in_srgb,var(--c-accent)_8%,var(--c-surface))]" : "border-line-strong bg-surface hover:border-accent")}
          >
            <Upload aria-hidden="true" className="size-5 text-accent" strokeWidth={1.75} />
            <span className="font-medium">{t("final.drop")}</span>
            <span className="text-xs text-muted">{t("final.filesHint", { size: formatBytes(MAX_FILE_BYTES, locale) })}</span>
            <input type="file" multiple accept={ACCEPTED_EXTENSIONS.join(",")} className="sr-only" aria-labelledby={`${uid}-files`} onChange={(e) => (e.target.files && addFiles(e.target.files), (e.target.value = ""))} data-field="files" />
          </label>
          {files.length ? (
            <ul className="grid gap-1.5">
              {files.map((f) => (
                <li key={`${f.name}-${f.size}`} className="flex items-center gap-2 border border-line bg-surface px-3 py-2 text-sm">
                  <Check aria-hidden="true" className="size-4 shrink-0 text-ok" strokeWidth={2} />
                  <span className="min-w-0 truncate">{f.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted">{formatBytes(f.size, locale)}</span>
                  <button type="button" onClick={() => setFiles(files.filter((x) => x !== f))} aria-label={t("final.remove", { name: f.name })} className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-surface-2">
                    <X aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {fileErrors.map((e) => (
            <p key={e} role="alert" className="field-error">
              {e}
            </p>
          ))}
        </div>
        <div className="field">
          <label htmlFor={`${uid}-notes`} className="field-label">
            {t("final.notes")}
          </label>
          <textarea id={`${uid}-notes`} rows={3} className="input resize-y" value={notes} onChange={(e) => (setNotes(e.target.value), setAdded(false))} placeholder={t("final.notesPlaceholder")} maxLength={3000} />
        </div>
        {added ? (
          <div className="grid gap-3 border border-ok bg-[color-mix(in_srgb,var(--c-ok)_8%,var(--c-surface))] p-4" role="status" data-added>
            <p className="flex items-center gap-2 font-semibold">
              <Check aria-hidden="true" className="size-5 text-ok" strokeWidth={2} />
              {t("final.added")}
            </p>
            <div className="flex flex-wrap gap-2">
              <NextLink href={requestPath} className="btn btn-primary">
                {t("final.goRequest")}
                <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
              </NextLink>
              <button type="button" className="btn btn-ghost" onClick={again}>
                <RotateCcw aria-hidden="true" className="size-4" strokeWidth={1.75} />
                {t("final.another")}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-primary w-full" onClick={add} disabled={!allOk} data-add-premium>
            <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
            {t("final.add")}
          </button>
        )}
        <p className="text-center text-sm text-muted">{t("final.noPrice")}</p>
      </>
    ),
  };

  /** riga del riepilogo per ogni passo */
  const lengthText =
    geo === "length"
      ? `${mm(spec.length ?? 0)} mm`
      : geo === "bend"
        ? `${mm(spec.angle ?? 90)}° · L1 ${mm(spec.leg1 ?? 0)} · L2 ${mm(spec.leg2 ?? 0)} mm`
        : geo === "twist"
          ? `${mm(spec.rotation ?? 90)}° · ${mm(spec.length ?? 0)} mm`
          : `X ${mm(spec.offset ?? 0)} · ${mm(spec.length ?? 0)} mm`;
  const summary: Record<StepId, string> = {
    type: t(`types.${tile}.name`),
    size: `${size.wr.replace("-", "")} · ${mm(size.a)} × ${mm(size.b)} mm · ${range(size.min, size.max, locale)} GHz`,
    flange1: f1Name,
    flange2: f2Name,
    length: lengthText,
    finish: `${t(`finish.${spec.finish}.name`)}${flex && spec.jacket ? ` · ${t("finish.jacketOn")}` : ""}`,
    final: `${qty} ${t("final.pieces")}${files.length ? ` · ${t("final.attached", { n: files.length })}` : ""}`,
  };
  const question = id === "length" && geo !== "length" ? t(`q.length_${geo}`) : t(`q.${id}`);

  return (
    <div ref={root} className="scroll-mt-24" data-premium-configurator data-step={id} data-type={spec.type}>
      {/* ------------------------------------------------------------ 7 passi */}
      <ol className="mb-6 flex gap-px overflow-x-auto border border-line bg-line [scrollbar-width:none]" aria-label={t("stepsLabel")}>
        {STEPS.map((s, i) => {
          const done = i < step && stepOk[s];
          const open = i <= reached;
          return (
            <li key={s} className="min-w-fit flex-1">
              <button
                type="button"
                onClick={() => open && go(i)}
                disabled={!open}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "flex h-full w-full items-center gap-2.5 px-3 py-3 text-left text-sm transition-colors lg:px-4",
                  i === step ? "bg-[color-mix(in_srgb,var(--c-accent)_10%,var(--c-surface))] font-semibold" : "bg-surface",
                  open ? "hover:bg-surface-2" : "cursor-not-allowed text-muted",
                )}
                data-step-tab={s}
              >
                <span aria-hidden="true" className={cn("grid size-7 shrink-0 place-items-center rounded-full border font-mono text-xs", done ? "border-accent bg-accent text-on-accent" : i === step ? "border-accent text-accent" : "border-line-strong text-muted")}>
                  {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className="whitespace-nowrap max-lg:hidden">{t(`steps.${s}`)}</span>
                {i === step ? <span className="whitespace-nowrap lg:hidden">{t(`steps.${s}`)}</span> : null}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:items-start xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
        {/* ------------------------------------------------- 3D e riepilogo */}
        {/* su telefono il 3D resta fisso sotto la testata mentre si scelgono le opzioni; il riepilogo va in fondo */}
        <div className="grid min-w-0 gap-4 max-lg:contents lg:sticky lg:top-24">
          <Stage3D spec={spec} labels={labels} focus={focus} code={code} className="w-full max-lg:sticky max-lg:top-[4.25rem] max-lg:z-20 max-lg:h-[40svh] max-lg:min-h-56 max-lg:shadow-[0_10px_24px_var(--c-shadow)] lg:h-[min(62vh,40rem)]" />
          <section aria-label={t("summary.title")} className="border border-line bg-surface p-4 max-lg:order-last sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="annot uppercase tracking-[0.14em] text-muted">{t("summary.title")}</h3>
                <p className="mt-1 break-words font-mono text-sm font-medium leading-snug sm:text-base" data-part-code>
                  {code}
                </p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={copyLink} data-copy-link>
                {copied ? <Check aria-hidden="true" className="size-4" strokeWidth={2} /> : <Link2 aria-hidden="true" className="size-4" strokeWidth={1.75} />}
                {copied ? t("summary.copied") : t("summary.copyLink")}
              </button>
            </div>
            <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {STEPS.map((s, i) => (
                <div key={s} className="flex min-w-0 gap-3">
                  <dt className="w-24 shrink-0 text-muted">{t(`steps.${s}`)}</dt>
                  <dd className={cn("min-w-0 break-words", (s === "flange1" || s === "flange2") && "font-mono text-[0.8125rem]", i > reached && "text-muted")}>{i > reached ? "—" : summary[s]}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        {/* ------------------------------------------------- passo corrente */}
        <div className="grid min-w-0 scroll-mt-24 content-start gap-5 border border-line bg-surface p-5 sm:p-6" data-step-panel={id}>
          <header className="grid gap-2">
            <p className="annot uppercase tracking-[0.16em] text-primary-ink">{t("stepOf", { n: step + 1, total: STEPS.length })}</p>
            <h2 className="text-display-s font-bold">{question}</h2>
            <p className="text-sm text-muted">{t(`hint.${id}`)}</p>
          </header>
          <div className="grid min-w-0 gap-4">{body[id]}</div>
          <div className="flex items-center justify-between gap-3 border-t border-line pt-5">
            <button type="button" className="btn btn-ghost" onClick={() => go(step - 1)} disabled={step === 0} data-prev>
              <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {t("back")}
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn btn-primary" onClick={() => go(step + 1)} disabled={!stepOk[id]} data-next>
                {t("next")}
                <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
