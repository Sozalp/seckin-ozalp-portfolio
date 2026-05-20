"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "../../lib/supabase";
import { loadLocalWorks, normalizeWorks, saveLocalWorks } from "../../lib/work-store";

const blankWork = {
  title_en: "",
  title_tr: "",
  description_en: "",
  description_tr: "",
  type: "artwork",
  year: new Date().getFullYear(),
  thumbnail_url: "",
  media_url: "",
  gumlet_video_id: "",
  sort_order: 100,
  published: true
};

export default function AdminClient() {
  const supabase = useMemo(() => getSupabase(), []);
  const localDemo = !isSupabaseConfigured && process.env.NODE_ENV !== "production";
  const adminDisabled = !isSupabaseConfigured && !localDemo;

  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [works, setWorks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(blankWork);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [images, setImages] = useState([]);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");

  useEffect(() => {
    if (localDemo) {
      setWorks(loadLocalWorks());
      setSession({ user: { email: "local-demo" } });
      return;
    }
    if (adminDisabled) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.subscription.unsubscribe();
  }, [adminDisabled, localDemo, supabase]);

  useEffect(() => {
    if (session) refreshWorks();
  }, [session]);

  useEffect(() => {
    if (selected && supabase && !localDemo) {
      refreshImages(selected);
    } else {
      setImages([]);
    }
  }, [selected]);

  async function refreshWorks() {
    if (localDemo) { setWorks(loadLocalWorks()); return; }
    if (!supabase) return;
    const { data, error } = await supabase.from("works").select("*").order("sort_order", { ascending: true });
    if (error) { setMessage(error.message); return; }
    setWorks(normalizeWorks(data || []));
  }

  async function refreshImages(workId) {
    const { data, error } = await supabase.from("work_images").select("*").eq("work_id", workId).order("sort_order", { ascending: true });
    if (error) { setMessage("Gallery: " + error.message); return; }
    setImages(data || []);
  }

  async function signIn(e) {
    e.preventDefault();
    if (!supabase) { setMessage("Supabase is not configured."); return; }
    setBusy(true); setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setMessage(error.message);
  }

  function editWork(work) {
    setSelected(work.id);
    setForm({ ...blankWork, ...work });
    setActiveTab("details");
    setMessage("");
  }

  function newWork() {
    setSelected(null);
    setForm({ ...blankWork, sort_order: works.length ? Math.max(...works.map(w => Number(w.sort_order || 0))) + 10 : 10 });
    setActiveTab("details");
    setMessage("");
    setImages([]);
  }

  async function saveWork(e) {
    e.preventDefault();
    setBusy(true); setMessage("");
    if (localDemo) {
      const next = selected
        ? works.map(w => w.id === selected ? { ...form, id: selected } : w)
        : [...works, { ...form, id: crypto.randomUUID() }];
      saveLocalWorks(next);
      setWorks(normalizeWorks(next));
      setSelected(null); setForm(blankWork);
      setMessage("Local demo saved."); setBusy(false); return;
    }
    const payload = {
      title_en: form.title_en, title_tr: form.title_tr,
      description_en: form.description_en, description_tr: form.description_tr,
      type: form.type, year: Number(form.year),
      thumbnail_url: form.thumbnail_url || null,
      media_url: form.media_url || "",
      gumlet_video_id: form.gumlet_video_id || "",
      sort_order: Number(form.sort_order || 0),
      published: Boolean(form.published)
    };
    const result = selected
      ? await supabase.from("works").update(payload).eq("id", selected)
      : await supabase.from("works").insert(payload);
    setBusy(false);
    if (result.error) { setMessage(result.error.message); return; }
    await refreshWorks();
    setSelected(null); setForm(blankWork); setMessage("Saved.");
  }

  async function deleteWork(id) {
    if (!confirm("Delete this work item?")) return;
    if (localDemo) {
      const next = works.filter(w => w.id !== id);
      saveLocalWorks(next); setWorks(next); return;
    }
    const { error } = await supabase.from("works").delete().eq("id", id);
    if (error) setMessage(error.message);
    await refreshWorks();
  }

  async function uploadThumbnail(file) {
    if (!file) return;
    if (localDemo) { setMessage("Local demo: paste a URL instead."); return; }
    setUploading(true); setMessage("");
    const ext = file.name.split(".").pop();
    const path = `works/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("portfolio").upload(path, file, { upsert: false });
    setUploading(false);
    if (error) { setMessage("Upload failed: " + error.message); return; }
    const { data } = supabase.storage.from("portfolio").getPublicUrl(path);
    setForm(f => ({ ...f, thumbnail_url: data.publicUrl }));
    setMessage("Thumbnail uploaded. Save to apply.");
  }

  async function addImageByUrl() {
    const url = newImageUrl.trim();
    if (!url || !supabase) return;
    setGalleryBusy(true); setMessage("");
    const baseOrder = images.length ? Math.max(...images.map(i => i.sort_order)) : 0;
    const { error } = await supabase.from("work_images").insert({
      work_id: selected, image_url: url, caption: "", sort_order: baseOrder + 10
    });
    setGalleryBusy(false);
    if (error) { setMessage("Hata: " + error.message); return; }
    setNewImageUrl("");
    await refreshImages(selected);
  }

  async function uploadGalleryImages(fileList) {
    if (!fileList || !supabase) return;
    setGalleryBusy(true); setMessage("");
    const baseOrder = images.length ? Math.max(...images.map(i => i.sort_order)) : 0;
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.split(".").pop();
      const path = `gallery/${selected}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("portfolio").upload(path, file, { upsert: false });
      if (error) { setMessage("Upload failed: " + error.message); continue; }
      const { data: urlData } = supabase.storage.from("portfolio").getPublicUrl(path);
      await supabase.from("work_images").insert({
        work_id: selected, image_url: urlData.publicUrl,
        caption: "", sort_order: baseOrder + (i + 1) * 10
      });
    }
    await refreshImages(selected);
    setGalleryBusy(false);
  }

  async function saveCaption(imageId, caption) {
    setImages(prev => prev.map(img => img.id === imageId ? { ...img, caption } : img));
    await supabase.from("work_images").update({ caption }).eq("id", imageId);
  }

  async function deleteImage(imageId) {
    if (!confirm("Delete this image?")) return;
    await supabase.from("work_images").delete().eq("id", imageId);
    setImages(prev => prev.filter(img => img.id !== imageId));
  }

  async function moveImage(idx, dir) {
    const next = [...images];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    await Promise.all(next.map((img, i) => supabase.from("work_images").update({ sort_order: i * 10 }).eq("id", img.id)));
    setImages(next.map((img, i) => ({ ...img, sort_order: i * 10 })));
  }

  if (adminDisabled) return (
    <main className="admin-shell">
      <section className="admin-card login-card">
        <p className="eyebrow">Portfolio Admin</p>
        <h1>Setup required</h1>
        <p className="admin-message">NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY missing.</p>
      </section>
    </main>
  );

  if (!session) return (
    <main className="admin-shell">
      <section className="admin-card login-card">
        <p className="eyebrow">Portfolio Admin</p>
        <h1>Sign in</h1>
        <form onSubmit={signIn} className="admin-form">
          <label>Email<input value={email} onChange={e => setEmail(e.target.value)} type="email" /></label>
          <label>Password<input value={password} onChange={e => setPassword(e.target.value)} type="password" /></label>
          <button disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
        </form>
        {message && <p className="admin-message">{message}</p>}
      </section>
    </main>
  );

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Portfolio Admin</p>
          <h1>Work Manager</h1>
        </div>
        <div className="admin-actions">
          <a href="/" target="_blank">View site</a>
          {isSupabaseConfigured && <button onClick={() => supabase.auth.signOut()}>Sign out</button>}
        </div>
      </header>

      {localDemo && <div className="admin-note">Local demo mode — Supabase not configured.</div>}

      <section className="admin-grid">
        {/* ── Work list ── */}
        <div className="admin-card">
          <div className="list-head">
            <h2>Work items</h2>
            <button onClick={newWork}>New</button>
          </div>
          <div className="work-list">
            {works.map(work => (
              <button
                key={work.id}
                className={selected === work.id ? "selected" : ""}
                onClick={() => editWork(work)}
              >
                <span>{work.sort_order}</span>
                <strong>{work.title_en || "Untitled"}</strong>
                <small>{work.type} · {work.published ? "published" : "draft"}</small>
              </button>
            ))}
          </div>
        </div>

        {/* ── Editor (tabbed) ── */}
        <div className="admin-card" style={{ padding: 0, display: "flex", flexDirection: "column" }}>
          {/* Tab bar — only when a work is selected */}
          {selected && (
            <div className="admin-tabs">
              <button
                type="button"
                className={activeTab === "details" ? "active" : ""}
                onClick={() => setActiveTab("details")}
              >Details</button>
              <button
                type="button"
                className={activeTab === "gallery" ? "active" : ""}
                onClick={() => { setActiveTab("gallery"); setMessage(""); }}
              >
                Gallery Images {images.length > 0 ? `(${images.length})` : ""}
              </button>
            </div>
          )}

          {/* Details tab */}
          {activeTab === "details" && (
            <form className="admin-form editor" style={{ padding: 20 }} onSubmit={saveWork}>
              <div className="list-head">
                <h2>{selected ? "Edit item" : "New item"}</h2>
                {selected && <button type="button" className="danger" onClick={() => deleteWork(selected)}>Delete</button>}
              </div>
              <div className="form-row">
                <label>Title EN<input value={form.title_en} onChange={e => setForm({ ...form, title_en: e.target.value })} required /></label>
                <label>Title TR<input value={form.title_tr} onChange={e => setForm({ ...form, title_tr: e.target.value })} required /></label>
              </div>
              <div className="form-row">
                <label>Type
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="video">Video</option>
                    <option value="artwork">Artwork</option>
                    <option value="project">Project</option>
                    <option value="game">Game</option>
                  </select>
                </label>
                <label>Year<input value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} type="number" /></label>
                <label>Order<input value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} type="number" /></label>
              </div>
              <label>Description EN<textarea value={form.description_en} onChange={e => setForm({ ...form, description_en: e.target.value })} rows={3} /></label>
              <label>Description TR<textarea value={form.description_tr} onChange={e => setForm({ ...form, description_tr: e.target.value })} rows={3} /></label>
              <label>Media URL<input value={form.media_url || ""} onChange={e => setForm({ ...form, media_url: e.target.value })} placeholder="YouTube, Vimeo, ArtStation…" /></label>
              <label>Gumlet Video ID<input value={form.gumlet_video_id || ""} onChange={e => setForm({ ...form, gumlet_video_id: e.target.value })} placeholder="Gumlet video ID" /></label>
              <label>Thumbnail URL<input value={form.thumbnail_url || ""} onChange={e => setForm({ ...form, thumbnail_url: e.target.value })} /></label>
              {form.thumbnail_url && (
                <img src={form.thumbnail_url} alt="preview"
                  style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 4, border: "1px solid var(--line)" }}
                  onError={e => { e.currentTarget.style.display = "none"; }} />
              )}
              <label>
                Upload thumbnail
                <input type="file" accept="image/*" onChange={e => uploadThumbnail(e.target.files?.[0])} disabled={uploading} />
                {uploading && <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.6 }}>Uploading…</span>}
              </label>
              <label className="check-row">
                <input type="checkbox" checked={Boolean(form.published)} onChange={e => setForm({ ...form, published: e.target.checked })} />
                Published
              </label>
              <button disabled={busy}>{busy ? "Saving..." : "Save work item"}</button>
              {message && <p className="admin-message">{message}</p>}
            </form>
          )}

          {/* Gallery tab */}
          {activeTab === "gallery" && selected && (
            <div style={{ padding: 20, flex: 1 }}>
              <div className="list-head" style={{ marginBottom: 16 }}>
                <h2>Gallery Images</h2>
                {!localDemo && (
                  <label style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "7px 16px", borderRadius: 4, cursor: galleryBusy ? "not-allowed" : "pointer",
                    background: "var(--accent)", color: "#1a1209",
                    fontSize: 12, fontWeight: 700, opacity: galleryBusy ? 0.6 : 1,
                  }}>
                    {galleryBusy ? "Yükleniyor…" : "+ Görsel ekle"}
                    <input type="file" accept="image/*" multiple style={{ display: "none" }}
                      onChange={e => uploadGalleryImages(e.target.files)} disabled={galleryBusy} />
                  </label>
                )}
              </div>

              {message && <p className="admin-message" style={{ marginBottom: 12 }}>{message}</p>}

              {/* URL ile görsel ekle */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input
                  value={newImageUrl}
                  onChange={e => setNewImageUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addImageByUrl())}
                  placeholder="Görsel URL'si yapıştırın…"
                  style={{ flex: 1, background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 12px", fontFamily: "inherit", fontSize: 13, borderRadius: 3 }}
                />
                <button
                  type="button"
                  onClick={addImageByUrl}
                  disabled={galleryBusy || !newImageUrl.trim()}
                  style={{ padding: "8px 16px", background: "var(--accent)", color: "#1a1209", border: "none", borderRadius: 3, fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  {galleryBusy ? "…" : "+ Ekle"}
                </button>
              </div>

              {images.length === 0 ? (
                <p style={{ color: "var(--text-mute)", fontSize: 13 }}>
                  Henüz görsel yok. Yukarıya URL yapıştırıp Ekle&apos;ye basın.
                </p>
              ) : (
                <div className="gallery-list">
                  {images.map((img, idx) => (
                    <div key={img.id} className="gallery-item">
                      <img src={img.image_url} alt={img.caption || ""} />
                      <div className="gallery-item-body">
                        <input
                          value={img.caption || ""}
                          onChange={e => saveCaption(img.id, e.target.value)}
                          placeholder="Not veya açıklama…"
                        />
                      </div>
                      <div className="gallery-item-actions">
                        <button type="button" onClick={() => moveImage(idx, -1)} disabled={idx === 0}>↑</button>
                        <button type="button" onClick={() => moveImage(idx, 1)} disabled={idx === images.length - 1}>↓</button>
                        <button type="button" className="danger" onClick={() => deleteImage(img.id)}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Placeholder when no work selected */}
          {!selected && (
            <div style={{ padding: 20, color: "var(--text-mute)", fontSize: 13 }}>
              Soldan bir iş öğesi seçin veya "New" ile yeni ekleyin.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
