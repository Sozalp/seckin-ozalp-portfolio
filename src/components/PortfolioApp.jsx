"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cvData } from "../lib/cv-data";
import { loadPublicWorks } from "../lib/work-store";

// ---- Sound effects ----
const Sfx = (() => {
  let ctx = null;
  let enabled = false;
  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
  }
  function setEnabled(v) { enabled = v; if (v) ensure(); }
  function blip(freq = 880, dur = 0.06, type = "sine", gain = 0.04) {
    if (!enabled || !ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  }
  return {
    setEnabled,
    click: () => blip(1200, 0.04, "square", 0.025),
    hover: () => blip(1800, 0.02, "sine", 0.015),
    whoosh: () => {
      if (!enabled || !ctx) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(220, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);
      g.gain.value = 0.05;
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.2);
    },
  };
})();

// ---- Render-pass name animation ----
function RenderName({ text, autoplay = true }) {
  const [stage, setStage] = useState(autoplay ? 0 : 3);
  useEffect(() => {
    if (!autoplay) { setStage(3); return; }
    setStage(0);
    const t1 = setTimeout(() => setStage(1), 200);
    const t2 = setTimeout(() => setStage(2), 1300);
    const t3 = setTimeout(() => setStage(3), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [autoplay, text]);
  return (
    <span className={`render-name stage-${stage}`}>
      <span className="ghost">{text}</span>
      <span className="layer l1">{text}</span>
      <span className="layer l2">{text}</span>
      <span className="layer l3">{text}</span>
    </span>
  );
}

// ---- Pass readout ----
function PassReadout({ stage }) {
  const passes = ["WIREFRAME", "SHADED", "FINAL"];
  return (
    <div className="pass-readout">
      <span className="mono" style={{ color: "var(--text-mute)" }}>PASS</span>
      {passes.map((p, i) => (
        <span key={p} className={`pass ${stage > i ? "done" : ""} ${stage === i ? "active" : ""}`}>
          {String(i + 1).padStart(2, "0")} {p}
        </span>
      ))}
    </div>
  );
}

// ---- Portrait with 3D tilt ----
function Portrait({ tiltStrength = 12 }) {
  const wrapRef = useRef(null);
  const innerRef = useRef(null);
  const [readout, setReadout] = useState({ rx: 0, ry: 0 });

  useEffect(() => {
    function onMove(e) {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
      const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
      const rx = (-dy * tiltStrength).toFixed(2);
      const ry = (dx * tiltStrength).toFixed(2);
      if (innerRef.current) {
        innerRef.current.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(8px)`;
      }
      setReadout({ rx, ry });
    }
    function onLeave() {
      if (innerRef.current) innerRef.current.style.transform = "rotateX(0) rotateY(0) translateZ(0)";
      setReadout({ rx: 0, ry: 0 });
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, [tiltStrength]);

  return (
    <div className="portrait-frame">
      <div className="portrait-viewport" ref={wrapRef}>
        <span className="portrait-corner tl" />
        <span className="portrait-corner tr" />
        <span className="portrait-corner bl" />
        <span className="portrait-corner br" />
        <div className="portrait-img-wrap" ref={innerRef}>
          <img src="/portrait.png" alt="Seçkin Özalp" draggable={false} />
        </div>
        <div className="portrait-readout">
          <div>CAM_01 / PERSP</div>
          <div>ROT.X <span className="v">{String(readout.rx).padStart(6, " ")}</span></div>
          <div>ROT.Y <span className="v">{String(readout.ry).padStart(6, " ")}</span></div>
        </div>
        <div className="portrait-labels">
          <span>S.ÖZALP</span>
          <span>·</span>
          <span>ASSET_01</span>
        </div>
      </div>
    </div>
  );
}

// ---- Hero ----
function Hero({ lang, tweaks }) {
  const [readoutStage, setReadoutStage] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setReadoutStage(1), 200);
    const t2 = setTimeout(() => setReadoutStage(2), 1300);
    const t3 = setTimeout(() => setReadoutStage(3), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [lang]);

  return (
    <section id="hero" className="hero" data-section-label="01 Hero">
      <div>
        <div className="meta">
          <span className="item">{lang === "tr" ? "İstanbul · Türkiye" : "İstanbul · Türkiye"}</span>
          <span className="item">{lang === "tr" ? "2002 → bugün" : "2002 → today"}</span>
          <span className="item">{lang === "tr" ? "Müsait" : "Available"}</span>
        </div>
        <PassReadout stage={readoutStage} />
        <h1>
          <RenderName text="SEÇKİN" autoplay={tweaks.renderPass} />
          <span className="surname">
            <RenderName text="ÖZALP" autoplay={tweaks.renderPass} />
          </span>
        </h1>
        <p className="subtitle">{cvData.tagline[lang]}</p>
        <div className="stats">
          <div className="stat"><div className="num">20+</div><div className="lbl">{lang === "tr" ? "yıl deneyim" : "years in the chair"}</div></div>
          <div className="stat"><div className="num">9</div><div className="lbl">{lang === "tr" ? "stüdyo / rol" : "studios / roles"}</div></div>
          <div className="stat"><div className="num">16</div><div className="lbl">{lang === "tr" ? "film & dizi" : "films & series"}</div></div>
          <div className="stat"><div className="num">3</div><div className="lbl">{lang === "tr" ? "mobil oyun" : "mobile titles"}</div></div>
        </div>
      </div>
      <Portrait tiltStrength={tweaks.tilt} />
    </section>
  );
}

// ---- About ----
function About({ lang }) {
  return (
    <section id="about" data-section-label="02 About">
      <div className="section-label"><span className="idx">02</span><span>{lang === "tr" ? "Hakkında" : "About"}</span></div>
      <div className="about-grid">
        <p className="bio">{cvData.bio[lang]}</p>
        <div className="about-sidebar">
          <div className="kv"><div className="k">{lang === "tr" ? "Konum" : "Based"}</div><div className="v">İstanbul, Türkiye</div></div>
          <div className="kv"><div className="k">{lang === "tr" ? "Şu an" : "Now"}</div><div className="v">Lead 3D Artist · Unico Studio Games</div></div>
          <div className="kv">
            <div className="k">{lang === "tr" ? "Eğitim" : "Education"}</div>
            <div className="v">
              {cvData.education.school}<br />
              <span style={{ color: "var(--text-mute)" }}>{cvData.education.program[lang]} · {cvData.education.years}</span>
            </div>
          </div>
          <div className="kv"><div className="k">{lang === "tr" ? "Diller" : "Languages"}</div><div className="v">{lang === "tr" ? "Türkçe, İngilizce" : "Turkish, English"}</div></div>
          <div className="kv"><div className="k">{lang === "tr" ? "Açık" : "Open to"}</div><div className="v">{lang === "tr" ? "Lead, supervisor & danışmanlık rolleri" : "Lead, supervisor & consulting roles"}</div></div>
        </div>
      </div>
    </section>
  );
}

// ---- Timeline ----
function Timeline({ lang }) {
  const items = cvData.experience;
  const minYear = 2002;
  const maxYear = 2026;
  const span = maxYear - minYear;
  const [active, setActive] = useState(0);
  const activeItem = items[active];

  const rows = useMemo(() => {
    const sorted = items.map((it, idx) => ({ it, idx })).sort((a, b) => a.it.startYear - b.it.startYear);
    const lanes = [];
    sorted.forEach(({ idx }) => {
      const it = items[idx];
      const monthStart = parseDate(it.start);
      const monthEnd = parseDate(it.end);
      let placed = false;
      for (const lane of lanes) {
        if (lane[lane.length - 1].monthEnd <= monthStart - 0.05) {
          lane.push({ idx, monthStart, monthEnd });
          placed = true; break;
        }
      }
      if (!placed) lanes.push([{ idx, monthStart, monthEnd }]);
    });
    return lanes;
  }, [items]);

  function parseDate(s) {
    const [y, m] = s.split("-").map(Number);
    return y + (m - 1) / 12;
  }
  function pos(v) { return ((v - minYear) / span) * 100; }

  const yearTicks = [];
  for (let y = minYear; y <= maxYear; y += 2) yearTicks.push(y);

  const categories = [
    { key: "games", label: lang === "tr" ? "OYUN" : "GAMES" },
    { key: "film", label: lang === "tr" ? "FİLM / TV" : "FILM / TV" },
    { key: "instruction", label: lang === "tr" ? "EĞİTİM" : "INSTRUCTION" },
    { key: "broadcast", label: lang === "tr" ? "YAYIN" : "BROADCAST" },
    { key: "founder", label: lang === "tr" ? "KURUCU" : "FOUNDER" },
  ];

  function duration(item) {
    const s = parseDate(item.start);
    const e = parseDate(item.end);
    const months = Math.round((e - s) * 12);
    if (months >= 12) {
      const y = Math.floor(months / 12);
      const mo = months % 12;
      return mo
        ? `${y} ${lang === "tr" ? "yıl" : "yr"} ${mo} ${lang === "tr" ? "ay" : "mo"}`
        : `${y} ${lang === "tr" ? "yıl" : y > 1 ? "yrs" : "yr"}`;
    }
    return `${months} ${lang === "tr" ? "ay" : "mo"}`;
  }

  return (
    <section id="timeline" data-section-label="03 Timeline">
      <div className="section-label"><span className="idx">03</span><span>{lang === "tr" ? "Kariyer Çizelgesi" : "Career Timeline"}</span></div>
      <h2 className="section-title">2002-2026 Pipeline</h2>

      <div className="cat-legend">
        {categories.map(c => (
          <span key={c.key}><span className={`dot cat-${c.key}`} />{c.label}</span>
        ))}
      </div>

      <div className="timeline">
        <div className="timeline-years">
          {yearTicks.map(y => <span key={y}>{y}</span>)}
        </div>
        <div className="timeline-track">
          <div className="timeline-bar" />
          {yearTicks.map(y => (
            <span key={y} className="timeline-tick" style={{ left: `${pos(y)}%` }} />
          ))}
          {rows.map((lane, laneIdx) =>
            lane.map(({ idx, monthStart, monthEnd }) => {
              const item = items[idx];
              const left = pos(monthStart);
              const width = Math.max(2.2, pos(monthEnd) - pos(monthStart));
              return (
                <div
                  key={idx}
                  className={`timeline-segment cat-${item.category} ${active === idx ? "active" : ""}`}
                  style={{ left: `${left}%`, width: `${width}%`, top: `${20 + laneIdx * 36}px` }}
                  onMouseEnter={() => { setActive(idx); Sfx.hover(); }}
                  onClick={() => { setActive(idx); Sfx.click(); }}
                >
                  {item.company}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="timeline-detail">
        <div className="meta-col">
          <div className="years">{activeItem.startYear} — {activeItem.endYear}</div>
          <div className="duration">{duration(activeItem)}</div>
          <div style={{ marginTop: 24 }}>
            <span className="mono" style={{ display: "inline-block", padding: "4px 8px", background: "var(--bg-3)", border: "1px solid var(--line)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase" }}>
              {categories.find(c => c.key === activeItem.category)?.label}
            </span>
          </div>
        </div>
        <div>
          <div className="role-label mono" style={{ textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 11 }}>{activeItem.role[lang]}</div>
          <h3>{activeItem.company}</h3>
          <p>{activeItem.summary[lang]}</p>
          {activeItem.bullets && (
            <ul>
              {activeItem.bullets[lang].map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          )}
          {activeItem.highlights && (
            <div className="highlights-row">
              {activeItem.highlights.map((h, i) => (
                <span className="chip mono" key={i}>
                  <strong>{h.title}</strong>
                  <span className="y">· {h.role} · {h.year}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ---- Image Gallery Modal ----
function ImageGalleryModal({ images, onClose }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#0b0b0c" }}>
      {/* Close */}
      <button onClick={onClose} style={{
        position: "absolute", top: 16, right: 20, zIndex: 2,
        background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.15)",
        color: "#aaa", cursor: "pointer", padding: "6px 14px",
        fontFamily: '"JetBrains Mono",monospace', fontSize: 11, letterSpacing: "0.1em", borderRadius: 3,
      }}>ESC / CLOSE</button>

      {/* Scrollable inner */}
      <div ref={scrollRef} style={{ position: "absolute", inset: 0, overflowY: "auto" }}>
        <div
          style={{ maxWidth: 900, margin: "0 auto", padding: "64px 24px 64px" }}
          onClick={e => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <div key={img.id} style={{ marginBottom: 56 }}>
              <img
                src={img.image_url}
                alt={img.caption || ""}
                style={{ width: "100%", display: "block", borderRadius: 4 }}
              />
              {img.caption && (
                <p style={{ color: "#aaa", fontSize: 13, marginTop: 10, lineHeight: 1.6 }}>{img.caption}</p>
              )}
              <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 10, color: "#555", letterSpacing: "0.14em", marginTop: 6 }}>
                {String(i + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Video Modal ----
function VideoModal({ videoId, title, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "#0b0b0c", display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{ position: "relative", width: "min(900px, 95vw)", aspectRatio: "16/9" }}
        onClick={e => e.stopPropagation()}
      >
        <iframe
          src={`https://play.gumlet.io/embed/${videoId}?autoplay=false&muted=false&loop=false&disable_player_controls=false`}
          style={{ width: "100%", height: "100%", border: "none" }}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={title}
        />
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: -44, right: 0,
            background: "none", border: "1px solid var(--line)",
            color: "var(--text-dim)", cursor: "pointer",
            padding: "6px 14px", fontFamily: '"JetBrains Mono", monospace',
            fontSize: 11, letterSpacing: "0.1em",
          }}
        >ESC / CLOSE</button>
      </div>
    </div>
  );
}

// ---- Work ----
function Work({ lang }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [works, setWorks] = useState([]);
  const [modal, setModal] = useState(null);
  const typeLabels = {
    video: "Video",
    artwork: "Artwork",
    project: lang === "tr" ? "Proje" : "Project",
    game: lang === "tr" ? "Oyun" : "Game",
  };
  const filters = [
    { k: "all", l: lang === "tr" ? "Hepsi" : "All" },
    { k: "video", l: "Video" },
    { k: "artwork", l: "Artwork" },
    { k: "project", l: lang === "tr" ? "Proje" : "Project" },
    { k: "game", l: lang === "tr" ? "Oyun" : "Game" },
  ];

  useEffect(() => {
    loadPublicWorks()
      .then(data => setWorks(data.map(w => ({
        title: { en: w.title_en, tr: w.title_tr },
        description: { en: w.description_en, tr: w.description_tr },
        type: w.type,
        year: w.year,
        thumbnail: w.thumbnail_url || null,
        href: w.media_url || "",
        gumletId: w.gumlet_video_id || "",
        images: w.images || [],
      }))))
      .catch(() => setWorks(cvData.works));
  }, []);

  const filtered = works.filter(w => typeFilter === "all" || w.type === typeFilter);

  return (
    <section id="work" data-section-label="04 Work">
      <div className="section-label"><span className="idx">04</span><span>Work Grid</span></div>
      <h2 className="section-title">{lang === "tr" ? "İşler, videolar ve artworkler." : "Work, videos and artwork."}</h2>

      <div className="films-controls work-controls">
        <div className="group">
          <span className="lbl">{lang === "tr" ? "Tür" : "Type"}</span>
          {filters.map(opt => (
            <button
              key={opt.k}
              className={`filter-chip ${typeFilter === opt.k ? "active" : ""}`}
              onClick={() => { setTypeFilter(opt.k); Sfx.click(); }}
            >{opt.l}</button>
          ))}
        </div>
      </div>

      <div className="work-grid">
        {filtered.map((item, i) => {
          const title = lang === "tr" ? item.title.tr : item.title.en;
          const description = lang === "tr" ? item.description.tr : item.description.en;
          const hasGumlet = Boolean(item.gumletId);
          const hasLink = Boolean(item.href);
          const hasGallery = Array.isArray(item.images) && item.images.length > 0;
          const thumbSrc = item.thumbnail
            || (hasGallery ? item.images[0].image_url : null)
            || (hasGumlet ? `https://video.gumlet.io/${item.gumletId}/thumbnail-1-0.png` : null);

          const thumb = (
            <div className="work-thumb">
              {thumbSrc ? (
                <img src={thumbSrc} alt={title} loading="lazy" />
              ) : (
                <div className="work-placeholder" aria-hidden="true">
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <strong>{typeLabels[item.type] || item.type}</strong>
                </div>
              )}
              {hasGumlet && !hasGallery && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.25)" }}>
                  <svg viewBox="0 0 48 48" style={{ width: 48, height: 48, opacity: 0.9 }}>
                    <circle cx="24" cy="24" r="22" fill="rgba(0,0,0,0.55)" />
                    <polygon points="19,14 37,24 19,34" fill="white" />
                  </svg>
                </div>
              )}
              {hasGallery && (
                <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.65)", borderRadius: 3, padding: "3px 8px", fontSize: 11, fontFamily: '"JetBrains Mono",monospace', color: "#fff" }}>
                  ⊞ {item.images.length}
                </div>
              )}
              <span className={`work-badge type-${item.type}`}>{typeLabels[item.type] || item.type}</span>
            </div>
          );

          const body = (
            <div className="work-body">
              <div className="work-meta">{item.year} · {typeLabels[item.type] || item.type}</div>
              <h3>{title}</h3>
              <p>{description}</p>
              <div className="work-action">
                {hasGallery
                  ? (lang === "tr" ? `⊞ ${item.images.length} görsel` : `⊞ ${item.images.length} images`)
                  : hasGumlet
                    ? (lang === "tr" ? "▶ Oynat" : "▶ Play")
                    : hasLink
                      ? (lang === "tr" ? "Aç ↗" : "Open ↗")
                      : (lang === "tr" ? "İçerik bekliyor" : "Ready for content")}
              </div>
            </div>
          );

          if (hasGallery) {
            return (
              <button className="work-card" key={item.title.en} style={{ textAlign: "left", cursor: "pointer" }}
                onClick={() => { setModal({ type: "gallery", images: item.images }); Sfx.click(); }}>
                {thumb}{body}
              </button>
            );
          }
          if (hasGumlet) {
            return (
              <button className="work-card" key={item.title.en} style={{ textAlign: "left", cursor: "pointer" }}
                onClick={() => { setModal({ type: "video", id: item.gumletId, title }); Sfx.click(); }}>
                {thumb}{body}
              </button>
            );
          }
          if (hasLink) {
            return (
              <a className="work-card" href={item.href} target="_blank" rel="noreferrer" key={item.title.en}>
                {thumb}{body}
              </a>
            );
          }
          return <article className="work-card" key={item.title.en}>{thumb}{body}</article>;
        })}
      </div>

      {modal?.type === "gallery" && <ImageGalleryModal images={modal.images} onClose={() => setModal(null)} />}
      {modal?.type === "video" && <VideoModal videoId={modal.id} title={modal.title} onClose={() => setModal(null)} />}
    </section>
  );
}

// ---- Films ----
function Films({ lang }) {
  const [roleFilter, setRoleFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  const yearBuckets = useMemo(() => {
    const set = new Set(cvData.films.map(f => f.year));
    return Array.from(set).sort((a, b) => b - a);
  }, []);

  const filtered = cvData.films.filter(f => {
    if (roleFilter !== "all" && f.role !== roleFilter) return false;
    if (yearFilter !== "all" && f.year !== Number(yearFilter)) return false;
    return true;
  });

  return (
    <section id="films" data-section-label="05 Films">
      <div className="section-label"><span className="idx">05</span><span>{lang === "tr" ? "Film & Dizi" : "Film & Series"}</span></div>
      <h2 className="section-title">{lang === "tr" ? "Daha önce yaptıklarımdan bir kesit." : "Selected film & series credits."}</h2>

      <div className="films-controls">
        <div className="group">
          <span className="lbl">{lang === "tr" ? "Rol" : "Role"}</span>
          {[
            { k: "all", l: lang === "tr" ? "Hepsi" : "All" },
            { k: "VFX Supervisor", l: "Supervisor" },
            { k: "VFX Artist", l: "VFX Artist" },
          ].map(opt => (
            <button key={opt.k} className={`filter-chip ${roleFilter === opt.k ? "active" : ""}`} onClick={() => { setRoleFilter(opt.k); Sfx.click(); }}>{opt.l}</button>
          ))}
        </div>
        <div className="group">
          <span className="lbl">{lang === "tr" ? "Yıl" : "Year"}</span>
          <button className={`filter-chip ${yearFilter === "all" ? "active" : ""}`} onClick={() => { setYearFilter("all"); Sfx.click(); }}>{lang === "tr" ? "Hepsi" : "All"}</button>
          {yearBuckets.map(y => (
            <button key={y} className={`filter-chip ${String(yearFilter) === String(y) ? "active" : ""}`} onClick={() => { setYearFilter(y); Sfx.click(); }}>{y}</button>
          ))}
        </div>
      </div>

      <div className="films-grid">
        {filtered.map(f => (
          <div className={`film-card ${f.role === "VFX Supervisor" ? "is-supervisor" : ""}`} key={f.title + f.year}>
            <div className="poster-wrap">
              {f.poster ? (
                <img className="poster-img" src={f.poster} alt={`${f.title} poster`} loading="lazy" />
              ) : (
                <div className="poster-fallback" aria-hidden="true">{f.title.slice(0, 2)}</div>
              )}
            </div>
            <div className="film-card-body">
              <div className="year">{f.year}</div>
              <div className="title">{f.title}</div>
              <div className="role">{f.role}</div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1 / -1", color: "var(--text-mute)", padding: 40, textAlign: "center" }}>
            {lang === "tr" ? "Bu filtreyle eşleşen iş yok." : "No credits match this filter."}
          </div>
        )}
      </div>
    </section>
  );
}

// ---- Skills ----
function Skills({ lang }) {
  const wrapRef = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) e.target.classList.add("visible");
      }
    }, { threshold: 0.2 });
    if (wrapRef.current) {
      wrapRef.current.querySelectorAll(".skill-bar").forEach(el => obs.observe(el));
    }
    return () => obs.disconnect();
  }, []);

  return (
    <section id="skills" data-section-label="06 Skills">
      <div className="section-label"><span className="idx">06</span><span>{lang === "tr" ? "Yetkinlikler & Yazılım" : "Stack & Software"}</span></div>
      <h2 className="section-title">{lang === "tr" ? "Günlük araçlarım." : "Tools I reach for daily."}</h2>
      <div className="skills-grid" ref={wrapRef}>
        <div>
          {cvData.stack.map(s => (
            <div className="skill-bar" key={s.name} style={{ "--level": s.level }}>
              <div className="top">
                <span className="name">{s.name}</span>
                <span className="pct">{Math.round(s.level * 100)}%</span>
              </div>
              <div className="track"><div className="fill" /></div>
            </div>
          ))}
        </div>
        <div>
          <div className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 16 }}>
            {lang === "tr" ? "Tüm yazılım" : "Full software list"}
          </div>
          <div className="software-list">
            {cvData.software.map(s => <span className="pill" key={s}>{s}</span>)}
          </div>
          <div className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: "0.2em", textTransform: "uppercase", margin: "32px 0 16px" }}>
            {lang === "tr" ? "Disiplinler" : "Disciplines"}
          </div>
          <div className="software-list">
            {(lang === "tr"
              ? ["Modelleme", "Sculpting", "Texturing", "Look Dev", "Rendering", "Simülasyon", "VFX", "Compositing", "Ekip yönetimi", "Pipeline"]
              : ["Modeling", "Sculpting", "Texturing", "Look Dev", "Rendering", "Simulation", "VFX", "Compositing", "Team Leadership", "Pipeline"]
            ).map(s => <span className="pill" key={s}>{s}</span>)}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- Contact ----
function Contact({ lang }) {
  const items = [
    { lbl: "Email", val: cvData.contact.email, href: `mailto:${cvData.contact.email}` },
    { lbl: "Phone", val: cvData.contact.phone, href: `tel:${cvData.contact.phone.replace(/\s/g, "")}` },
    { lbl: "Web", val: cvData.contact.web, href: `https://${cvData.contact.web}` },
    { lbl: "LinkedIn", val: cvData.contact.linkedin, href: `https://${cvData.contact.linkedin}` },
  ];
  return (
    <section id="contact" className="contact-section" data-section-label="07 Contact">
      <div className="section-label"><span className="idx">07</span><span>{lang === "tr" ? "İletişim" : "Get in touch"}</span></div>
      <h2 className="contact-cta">
        {lang === "tr"
          ? <><em>Proje</em> var mı?<br />Birlikte üretelim.</>
          : <>Got a <em>project</em>?<br />Let&apos;s make something.</>}
      </h2>
      <div className="contact-grid">
        {items.map(it => (
          <a className="contact-card" key={it.lbl} href={it.href} target="_blank" rel="noreferrer">
            <span className="lbl mono">{it.lbl}</span>
            <span className="val">{it.val}</span>
            <span className="arrow">↗</span>
          </a>
        ))}
      </div>
    </section>
  );
}

// ---- Tweaks panel (simplified for Next.js) ----
function TweaksPanel({ tweaks, setTweak }) {
  const [open, setOpen] = useState(false);
  const accentOptions = ["#E8833A", "#00ff9c", "#ff5252", "#c8a8ff", "#f3eee6"];

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 100,
          width: 40, height: 40, borderRadius: "50%",
          background: "var(--accent)", border: "none",
          color: "#1a1209", fontSize: 18, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}
        title="Tweaks"
      >⚙</button>

      {open && (
        <div style={{
          position: "fixed", bottom: 70, right: 20, zIndex: 100,
          width: 260, background: "rgba(19,19,22,0.95)",
          border: "1px solid var(--line)", borderRadius: 8,
          padding: "16px", backdropFilter: "blur(12px)",
          fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
          color: "var(--text-dim)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
        }}>
          <div style={{ fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16, color: "var(--text-mute)" }}>Tweaks</div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ marginBottom: 8, color: "var(--text-mute)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase" }}>Accent</div>
            <div style={{ display: "flex", gap: 6 }}>
              {accentOptions.map(c => (
                <button
                  key={c}
                  onClick={() => setTweak("accent", c)}
                  style={{
                    width: 28, height: 28, borderRadius: 4, border: "none",
                    background: c, cursor: "pointer",
                    outline: tweaks.accent === c ? "2px solid var(--text)" : "none",
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ marginBottom: 8, color: "var(--text-mute)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase" }}>Theme</div>
            <div style={{ display: "flex", gap: 6 }}>
              {["dark", "light"].map(t => (
                <button key={t} onClick={() => setTweak("theme", t)} style={{
                  padding: "5px 12px", borderRadius: 4, cursor: "pointer", fontSize: 11,
                  background: tweaks.theme === t ? "var(--accent)" : "transparent",
                  border: "1px solid var(--line)",
                  color: tweaks.theme === t ? "#1a1209" : "var(--text-dim)",
                  fontFamily: "inherit",
                }}>{t === "dark" ? "Dark" : "Light"}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ marginBottom: 8, color: "var(--text-mute)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase" }}>Render-pass intro</div>
            <button onClick={() => setTweak("renderPass", !tweaks.renderPass)} style={{
              padding: "5px 12px", borderRadius: 4, cursor: "pointer", fontSize: 11,
              background: tweaks.renderPass ? "var(--accent)" : "transparent",
              border: "1px solid var(--line)",
              color: tweaks.renderPass ? "#1a1209" : "var(--text-dim)",
              fontFamily: "inherit",
            }}>{tweaks.renderPass ? "On" : "Off"}</button>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ marginBottom: 8, color: "var(--text-mute)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase" }}>Sound effects</div>
            <button onClick={() => setTweak("sound", !tweaks.sound)} style={{
              padding: "5px 12px", borderRadius: 4, cursor: "pointer", fontSize: 11,
              background: tweaks.sound ? "var(--accent)" : "transparent",
              border: "1px solid var(--line)",
              color: tweaks.sound ? "#1a1209" : "var(--text-dim)",
              fontFamily: "inherit",
            }}>{tweaks.sound ? "On" : "Off"}</button>
          </div>

          <div>
            <div style={{ marginBottom: 8, color: "var(--text-mute)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase" }}>Portrait tilt: {tweaks.tilt}°</div>
            <input
              type="range" min={0} max={28} step={1}
              value={tweaks.tilt}
              onChange={e => setTweak("tilt", Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
          </div>
        </div>
      )}
    </>
  );
}

// ---- Main App ----
const navItems = [
  { id: "hero", l: { en: "Intro", tr: "Giriş" } },
  { id: "about", l: { en: "About", tr: "Hakkında" } },
  { id: "timeline", l: { en: "Career", tr: "Kariyer" } },
  { id: "work", l: { en: "Work", tr: "Work" } },
  { id: "films", l: { en: "Films", tr: "Filmler" } },
  { id: "skills", l: { en: "Stack", tr: "Stack" } },
  { id: "contact", l: { en: "Contact", tr: "İletişim" } },
];

export default function PortfolioApp() {
  const [tweaks, setTweaks] = useState({
    accent: "#E8833A",
    theme: "dark",
    lang: "en",
    sound: false,
    renderPass: true,
    tilt: 12,
  });

  function setTweak(key, val) {
    setTweaks(prev => ({ ...prev, [key]: val }));
  }

  const lang = tweaks.lang;
  const [activeSection, setActiveSection] = useState("hero");

  // Apply CSS vars for accent & theme
  useEffect(() => {
    document.documentElement.classList.toggle("light", tweaks.theme === "light");
    document.documentElement.style.setProperty("--accent", tweaks.accent);
    document.documentElement.style.setProperty("--accent-glow", tweaks.accent + "55");
    document.documentElement.style.setProperty("--accent-soft", tweaks.accent + "26");
  }, [tweaks.theme, tweaks.accent]);

  // Sound toggle
  useEffect(() => {
    Sfx.setEnabled(!!tweaks.sound);
  }, [tweaks.sound]);

  // Reveal on scroll
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          Sfx.whoosh();
        }
      }
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal, .reveal-stagger, section").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [lang]);

  // Active nav section
  useEffect(() => {
    const ids = navItems.map(n => n.id);
    function onScroll() {
      const mid = window.innerHeight * 0.35;
      let current = "hero";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= mid) current = id;
      }
      setActiveSection(current);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({ top: el.offsetTop - 60, behavior: "smooth" });
    Sfx.click();
  }

  return (
    <>
      <div className="bg-decor" />
      <div className="bg-grain" />

      <header className="topnav">
        <div className="brand">
          <span className="dot" />
          <span>S.ÖZALP / CV.2026</span>
        </div>
        <nav className="navlinks">
          {navItems.map(n => (
            <button
              key={n.id}
              className={activeSection === n.id ? "active" : ""}
              onClick={() => scrollTo(n.id)}
              onMouseEnter={() => Sfx.hover()}
            >{n.l[lang]}</button>
          ))}
        </nav>
        <div className="controls">
          <div className="langtoggle">
            <button className={lang === "en" ? "active" : ""} onClick={() => { setTweak("lang", "en"); Sfx.click(); }}>EN</button>
            <button className={lang === "tr" ? "active" : ""} onClick={() => { setTweak("lang", "tr"); Sfx.click(); }}>TR</button>
          </div>
          <button
            className={`iconbtn ${tweaks.sound ? "on" : ""}`}
            onClick={() => setTweak("sound", !tweaks.sound)}
            title="Sound"
          >
            {tweaks.sound ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 9v6h4l5 5V4L8 9H4z"/><path d="M16 9a3 3 0 010 6"/><path d="M19 6a7 7 0 010 12"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 9v6h4l5 5V4L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>
            )}
          </button>
          <button
            className="iconbtn"
            onClick={() => setTweak("theme", tweaks.theme === "dark" ? "light" : "dark")}
            title="Theme"
          >
            {tweaks.theme === "dark" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
            )}
          </button>
        </div>
      </header>

      <main>
        <Hero lang={lang} tweaks={tweaks} />
        <About lang={lang} />
        <Timeline lang={lang} />
        <Work lang={lang} />
        <Films lang={lang} />
        <Skills lang={lang} />
        <Contact lang={lang} />
      </main>

      <footer>
        <span>SEÇKİN ÖZALP — CV 2026</span>
        <span>{lang === "tr" ? "Sevgiyle hazırlandı" : "Crafted with care"}</span>
      </footer>

      <TweaksPanel tweaks={tweaks} setTweak={setTweak} />
    </>
  );
}
