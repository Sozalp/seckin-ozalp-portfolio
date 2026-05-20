"use client";

import { initialWorks } from "./seed-data";
import { getSupabase, isSupabaseConfigured } from "./supabase";

const localKey = "seckin-portfolio-works";

export function normalizeWorks(rows) {
  return [...rows].map((work) => ({
    gumlet_video_id: "",
    ...work
  })).sort((a, b) => {
    const order = Number(a.sort_order || 0) - Number(b.sort_order || 0);
    if (order !== 0) return order;
    return Number(b.year || 0) - Number(a.year || 0);
  });
}

export function loadLocalWorks() {
  if (typeof window === "undefined") return initialWorks;
  const stored = window.localStorage.getItem(localKey);
  if (!stored) return initialWorks;
  try {
    return normalizeWorks(JSON.parse(stored));
  } catch {
    return initialWorks;
  }
}

export function saveLocalWorks(works) {
  window.localStorage.setItem(localKey, JSON.stringify(normalizeWorks(works)));
}

export async function loadPublicWorks() {
  if (!isSupabaseConfigured) return loadLocalWorks().filter((work) => work.published);
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("works")
    .select("*, work_images(id, image_url, caption, sort_order)")
    .eq("published", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return normalizeWorks(data || []).map(w => ({
    ...w,
    images: (w.work_images || []).slice().sort((a, b) => a.sort_order - b.sort_order),
  }));
}
