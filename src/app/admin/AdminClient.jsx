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
  const [images, setImages] = useState([]);
  const [galleryBusy, setGalleryBusy] = useState(false);

  useEffect(() => {
    if (localDemo) {
      setWorks(loadLocalWorks());
      setSession({ user: { email: "local-demo" } });
      return;
    }
    if (adminDisabled) return;

    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.subscription.unsubscribe();
  }, [adminDisabled, localDemo, supabase]);

  useEffect(() => {
    if (session) refreshWorks();
  }, [session]);

  useEffect(() => {
    if (selected && supabase) {
      refreshImages(selected);
    } else {
      setImages([]);
    }
  }, [selected]);

  async function refreshWorks() {
    if (localDemo) {
      setWorks(loadLocalWorks());
      return;
    }
    if (!supabase) return;
    const { data, error } = await supabase.from("works").select("*").order("sort_order", { ascending: true });
    if (error) {
      setMessage(error.message);
      return;
    }
    setWorks(normalizeWorks(data || []));
  }

  async function signIn(event) {
    event.preventDefault();
    if (!supabase) {
      setMessage("Supabase is not configured for this deployment.");
      return;
    }
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setMessage(error.message);
  }

  function editWork(work) {
    setSelected(work.id);
    setForm({ ...blankWork, ...work });
  }

  function newWork() {
    setSelected(null);
    setForm({ ...blankWork, sort_order: works.length ? Math.max(...works.map((work) => Number(work.sort_order || 0))) + 10 : 10 });
  }

  async function saveWork(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    if (localDemo) {
      const next = selected
        ? works.map((work) => (work.id === selected ? { ...form, id: selected } : work))
        : [...works, { ...form, id: crypto.randomUUID() }];
      saveLocalWorks(next);
      setWorks(normalizeWorks(next));
      setSelected(null);
      setForm(blankWork);
      setMessage("Local demo saved.");
      setBusy(false);
      return;
    }

    const payload = {
      title_en: form.title_en,
      title_tr: form.title_tr,
      description_en: form.description_en,
      description_tr: form.description_tr,
      type: form.type,
      year: Number(form.year),
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
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    await refreshWorks();
    setSelected(null);
    setForm(blankWork);
    setMessage("Saved.");
  }

  async function deleteWork(id) {
    if (!confirm("Delete this work item?")) return;
    if (localDemo) {
      const next = works.filter((work) => work.id !== id);
      saveLocalWorks(next);
      setWorks(next);
      return;
    }
    const { error } = await supabase.from("works").delete().eq("id", id);
    if (error) setMessage(error.message);
    await refreshWorks();
  }

  async function uploadThumbnail(file) {
    if (!file) return;
    if (localDemo) {
      setMessage("Local demo cannot upload files. Paste a thumbnail URL instead.");
      return;
    }
    setUploading(true);
    setMessage("");
    const ext = file.name.split(".").pop();
    const path = `works/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("portfolio").upload(path, file, { upsert: false });
    setUploading(false);
    if (error) {
      setMessage("Upload failed: " + error.message + " — Supabase Storage'da 'portfolio' adlı public bucket oluşturuldu mu?");
      return;
    }
    const { data } = supabase.storage.from("portfolio").getPublicUrl(path);
    setForm((current) => ({ ...current, thumbnail_url: data.publicUrl }));
    setMessage("Thumbnail uploaded. Save work item to apply.");
  }

  async function refreshImages(workId) {
    const { data } = await supabase.from("work_images").select("*").eq("work_id", workId).order("sort_order");
    setImages(data || []);
  }

  async function uploadGalleryImages(fileList) {
    if (!fileList || !supabase) return;
    setGalleryBusy(true);
    setMessage("");
    const baseOrder = images.length ? Math.max(...images.map(i => i.sort_order)) : 0;
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.split(".").pop();
      const path = `gallery/${selected}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("portfolio").upload(path, file, { upsert: false });
      if (error) { setMessage("Upload failed: " + error.message); continue; }
      const { data: urlData } = supabase.storage.from("portfolio").getPublicUrl(path);
      await supabase.from("work_images").insert({
        work_id: selected,
        image_url: urlData.publicUrl,
        caption: "",
        sort_order: baseOrder + (i + 1) * 10,
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
    const updates = next.map((img, i) =>
      supabase.from("work_images").update({ sort_order: i * 10 }).eq("id", img.id)
    );
    await Promise.all(updates);
    setImages(next.map((img, i) => ({ ...img, sort_order: i * 10 })));
  }

  if (adminDisabled) {
    return (
      <main className="admin-shell">
        <section className="admin-card login-card">
          <p className="eyebrow">Portfolio Admin</p>
          <h1>Setup required</h1>
          <p className="admin-message">Supabase environment variables are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel to enable the admin panel.</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="admin-shell">
        <section className="admin-card login-card">
          <p className="eyebrow">Portfolio Admin</p>
          <h1>Sign in</h1>
          <form onSubmit={signIn} className="admin-form">
            <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" /></label>
            <label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" /></label>
            <button disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
          </form>
          {message && <p className="admin-message">{message}</p>}
        </section>
      </main>
    );
  }

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

      {localDemo && (
        <div className="admin-note">Supabase is not configured. This admin panel is running in local demo mode.</div>
      )}

      <section className="admin-grid">
        <div className="admin-card">
          <div className="list-head">
            <h2>Work items</h2>
            <button onClick={newWork}>New</button>
          </div>
          <div className="work-list">
            {works.map((work) => (
              <button className={selected === work.id ? "selected" : ""} key={work.id} onClick={() => editWork(work)}>
                <span>{work.sort_order}</span>
                <strong>{work.title_en || "Untitled"}</strong>
                <small>{work.type} · {work.published ? "published" : "draft"}</small>
              </button>
            ))}
          </div>
        </div>

        <form className="admin-card admin-form editor" onSubmit={saveWork}>
          <div className="list-head">
            <h2>{selected ? "Edit item" : "New item"}</h2>
            {selected && <button type="button" className="danger" onClick={() => deleteWork(selected)}>Delete</button>}
          </div>

          <div className="form-row">
            <label>Title EN<input value={form.title_en} onChange={(event) => setForm({ ...form, title_en: event.target.value })} required /></label>
            <label>Title TR<input value={form.title_tr} onChange={(event) => setForm({ ...form, title_tr: event.target.value })} required /></label>
          </div>
          <div className="form-row">
            <label>Type
              <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                <option value="video">Video</option>
                <option value="artwork">Artwork</option>
                <option value="project">Project</option>
              </select>
            </label>
            <label>Year<input value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} type="number" /></label>
            <label>Order<input value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: event.target.value })} type="number" /></label>
          </div>

          <label>Description EN<textarea value={form.description_en} onChange={(event) => setForm({ ...form, description_en: event.target.value })} rows={4} /></label>
          <label>Description TR<textarea value={form.description_tr} onChange={(event) => setForm({ ...form, description_tr: event.target.value })} rows={4} /></label>
          <label>Media URL<input value={form.media_url || ""} onChange={(event) => setForm({ ...form, media_url: event.target.value })} placeholder="YouTube, Vimeo, ArtStation, Behance..." /></label>
          <label>Gumlet Video ID<input value={form.gumlet_video_id || ""} onChange={(event) => setForm({ ...form, gumlet_video_id: event.target.value })} placeholder="Gumlet video ID" /></label>
          <label>Thumbnail URL<input value={form.thumbnail_url || ""} onChange={(event) => setForm({ ...form, thumbnail_url: event.target.value })} /></label>
          {form.thumbnail_url && (
            <div style={{ marginTop: -8, marginBottom: 4 }}>
              <img
                src={form.thumbnail_url}
                alt="thumbnail preview"
                style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 4, border: "1px solid var(--admin-line, #333)" }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </div>
          )}
          <label>
            Upload thumbnail
            <input type="file" accept="image/*" onChange={(event) => uploadThumbnail(event.target.files?.[0])} disabled={uploading} />
            {uploading && <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.6 }}>Uploading...</span>}
          </label>
          <label className="check-row">
            <input type="checkbox" checked={Boolean(form.published)} onChange={(event) => setForm({ ...form, published: event.target.checked })} />
            Published
          </label>

          <button disabled={busy}>{busy ? "Saving..." : "Save work item"}</button>
          {message && <p className="admin-message">{message}</p>}
        </form>
      </section>

      {selected && (
        <section className="admin-card gallery-panel">
          <div className="list-head">
            <h2>Gallery Images</h2>
            {!localDemo && (
              <label style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 4, cursor: "pointer",
                background: "var(--accent, #E8833A)", color: "#1a1209",
                fontSize: 12, fontFamily: "inherit", fontWeight: 600,
                opacity: galleryBusy ? 0.6 : 1, pointerEvents: galleryBusy ? "none" : "auto",
              }}>
                {galleryBusy ? "Uploading…" : "+ Add images"}
                <input
                  type="file" accept="image/*" multiple
                  style={{ display: "none" }}
                  onChange={e => uploadGalleryImages(e.target.files)}
                  disabled={galleryBusy}
                />
              </label>
            )}
          </div>

          {images.length === 0 && (
            <p style={{ color: "var(--text-mute, #666)", fontSize: 13, padding: "16px 0" }}>
              Bu iş öğesi için henüz görsel yok. "+ Add images" ile yükleyin.
            </p>
          )}

          <div className="gallery-list">
            {images.map((img, idx) => (
              <div key={img.id} className="gallery-item">
                <img src={img.image_url} alt={img.caption || ""} />
                <div className="gallery-item-body">
                  <input
                    value={img.caption || ""}
                    onChange={e => saveCaption(img.id, e.target.value)}
                    placeholder="Not veya açıklama ekle…"
                  />
                </div>
                <div className="gallery-item-actions">
                  <button onClick={() => moveImage(idx, -1)} disabled={idx === 0} title="Yukarı taşı">↑</button>
                  <button onClick={() => moveImage(idx, 1)} disabled={idx === images.length - 1} title="Aşağı taşı">↓</button>
                  <button className="danger" onClick={() => deleteImage(img.id)} title="Sil">✕</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
