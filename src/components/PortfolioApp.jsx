"use client";

import { useEffect, useMemo, useState } from "react";
import { films, profile } from "../lib/seed-data";
import { loadPublicWorks } from "../lib/work-store";

const navItems = [
  { id: "hero", label: "Intro" },
  { id: "about", label: "About" },
  { id: "career", label: "Career" },
  { id: "work", label: "Work" },
  { id: "films", label: "Films" },
  { id: "stack", label: "Stack" },
  { id: "contact", label: "Contact" }
];

const typeLabels = {
  video: "Video",
  artwork: "Artwork",
  project: "Project"
};

export default function PortfolioApp() {
  const [lang, setLang] = useState("en");
  const [active, setActive] = useState("hero");
  const [works, setWorks] = useState([]);
  const [workFilter, setWorkFilter] = useState("all");
  const [filmYear, setFilmYear] = useState("all");

  useEffect(() => {
    loadPublicWorks()
      .then(setWorks)
      .catch(() => setWorks([]));
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const mid = window.innerHeight * 0.35;
      let current = "hero";
      for (const item of navItems) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= mid) current = item.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const filteredWorks = works.filter((work) => workFilter === "all" || work.type === workFilter);
  const filmYears = useMemo(() => [...new Set(films.map((film) => film.year))].sort((a, b) => b - a), []);
  const filteredFilms = films.filter((film) => filmYear === "all" || film.year === Number(filmYear));

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <div className="bg-grid" />
      <header className="topnav">
        <div className="brand"><span className="dot" />S.OZALP / PORTFOLIO</div>
        <nav className="navlinks" aria-label="Primary">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={active === item.id ? "active" : ""}
              onClick={() => scrollTo(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="langtoggle">
          <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
          <button className={lang === "tr" ? "active" : ""} onClick={() => setLang("tr")}>TR</button>
        </div>
      </header>

      <main>
        <section id="hero" className="hero">
          <div>
            <div className="section-label"><span>01</span><span>{profile.location}</span></div>
            <h1><span>SECKIN</span><span>OZALP</span></h1>
            <p className="subtitle">{profile.tagline[lang]}</p>
            <div className="stats">
              {profile.stats.map((stat) => (
                <div className="stat" key={stat.label.en}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label[lang]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="portrait-card">
            <img src="/portrait.png" alt="Seckin Ozalp portrait" />
          </div>
        </section>

        <section id="about">
          <div className="section-label"><span>02</span><span>About</span></div>
          <h2>{lang === "tr" ? "3D, VFX ve oyun art uretimi." : "3D, VFX and game art production."}</h2>
          <p className="lead">
            {lang === "tr"
              ? "Broadcast graphics, film VFX, 3D production and mobile game art arasinda yirmi yili askin deneyim."
              : "Twenty-plus years moving between broadcast graphics, film VFX, 3D production and mobile game art."}
          </p>
        </section>

        <section id="career">
          <div className="section-label"><span>03</span><span>Career</span></div>
          <h2>{lang === "tr" ? "Kariyer ozeti." : "Career snapshot."}</h2>
          <div className="career-panel">
            <div><strong>Now</strong><span>Lead 3D Artist · Unico Studio Games</span></div>
            <div><strong>Focus</strong><span>3D art, VFX, rendering, game assets, pipeline</span></div>
            <div><strong>Archive</strong><span>TRT, film VFX, instruction and production roles</span></div>
          </div>
        </section>

        <section id="work">
          <div className="section-label"><span>04</span><span>Work Grid</span></div>
          <h2>{lang === "tr" ? "Isler, videolar ve artworkler." : "Work, videos and artwork."}</h2>
          <div className="filters">
            {["all", "video", "artwork", "project"].map((type) => (
              <button
                key={type}
                className={workFilter === type ? "active" : ""}
                onClick={() => setWorkFilter(type)}
              >
                {type === "all" ? "All" : typeLabels[type]}
              </button>
            ))}
          </div>
          <div className="work-grid">
            {filteredWorks.map((work, index) => (
              <WorkCard key={work.id} work={work} index={index} lang={lang} />
            ))}
          </div>
        </section>

        <section id="films">
          <div className="section-label"><span>05</span><span>Films</span></div>
          <h2>{lang === "tr" ? "Secili film ve dizi isleri." : "Selected film and series credits."}</h2>
          <div className="filters">
            <button className={filmYear === "all" ? "active" : ""} onClick={() => setFilmYear("all")}>All</button>
            {filmYears.map((year) => (
              <button key={year} className={filmYear === year ? "active" : ""} onClick={() => setFilmYear(year)}>{year}</button>
            ))}
          </div>
          <div className="films-grid">
            {filteredFilms.map((film) => (
              <article className="film-card" key={`${film.title}-${film.year}`}>
                <img src={film.poster} alt={`${film.title} poster`} />
                <div>
                  <span>{film.year}</span>
                  <h3>{film.title}</h3>
                  <p>{film.role}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="stack">
          <div className="section-label"><span>06</span><span>Stack</span></div>
          <h2>{lang === "tr" ? "Gunluk araclar ve disiplinler." : "Daily tools and disciplines."}</h2>
          <div className="stack-list">
            {["Maya", "ZBrush", "Substance", "Blender", "After Effects", "Unreal", "Unity", "Rendering", "Simulation", "Compositing", "Pipeline", "Team Leadership"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>

        <section id="contact">
          <div className="section-label"><span>07</span><span>Contact</span></div>
          <h2>{lang === "tr" ? "Bir proje mi var?" : "Got a project?"}</h2>
          <a className="contact-link" href="mailto:seckin.ozalp@gmail.com">seckin.ozalp@gmail.com</a>
        </section>
      </main>
    </>
  );
}

function WorkCard({ work, index, lang }) {
  const title = lang === "tr" ? work.title_tr : work.title_en;
  const description = lang === "tr" ? work.description_tr : work.description_en;
  const body = (
    <>
      <div className="work-thumb">
        {work.thumbnail_url ? (
          <img src={work.thumbnail_url} alt={title} />
        ) : (
          <div className="work-placeholder">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{typeLabels[work.type] || work.type}</strong>
          </div>
        )}
        <span className={`badge ${work.type}`}>{typeLabels[work.type] || work.type}</span>
      </div>
      <div className="work-body">
        <span>{work.year} · {typeLabels[work.type] || work.type}</span>
        <h3>{title}</h3>
        <p>{description}</p>
        <small>{work.media_url ? "Open" : "Ready for content"}</small>
      </div>
    </>
  );

  if (work.media_url) {
    return <a className="work-card" href={work.media_url} target="_blank" rel="noreferrer">{body}</a>;
  }
  return <article className="work-card">{body}</article>;
}
