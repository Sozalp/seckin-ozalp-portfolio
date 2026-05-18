create extension if not exists "pgcrypto";

create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  title_en text not null,
  title_tr text not null,
  description_en text not null default '',
  description_tr text not null default '',
  type text not null check (type in ('video', 'artwork', 'project')),
  year integer not null default extract(year from now())::integer,
  thumbnail_url text,
  media_url text,
  gumlet_video_id text not null default '',
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.works
add column if not exists gumlet_video_id text not null default '';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists works_set_updated_at on public.works;
create trigger works_set_updated_at
before update on public.works
for each row execute function public.set_updated_at();

alter table public.works enable row level security;

drop policy if exists "Public can read published works" on public.works;
create policy "Public can read published works"
on public.works for select
using (published = true);

drop policy if exists "Authenticated admins can manage works" on public.works;
create policy "Authenticated admins can manage works"
on public.works for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

insert into public.works
  (title_en, title_tr, description_en, description_tr, type, year, thumbnail_url, media_url, gumlet_video_id, sort_order, published)
values
  ('Showreel / Featured Work', 'Showreel / One Cikan Is', 'Use this slot for a showreel, breakdown reel or highlighted client work.', 'Bu alan showreel, breakdown reel veya one cikan musteri isi icin.', 'video', 2026, null, '', '', 10, true),
  ('3D Character Artwork', '3D Karakter Artwork', 'A portfolio card for sculpting, look development, lighting or final renders.', 'Sculpting, look development, lighting veya final render isleri icin.', 'artwork', 2026, null, '', '', 20, true),
  ('Environment / Asset Work', 'Environment / Asset Isleri', 'Use for props, environments, game assets or production-ready model sets.', 'Prop, environment, oyun assetleri veya production-ready model setleri icin.', 'artwork', 2026, null, '', '', 30, true),
  ('VFX Breakdown', 'VFX Breakdown', 'A slot for before/after shots, compositing breakdowns and simulation passes.', 'Before/after shotlari, compositing breakdownlari ve simulasyon passleri icin.', 'video', 2026, null, '', '', 40, true),
  ('Game Art Production', 'Game Art Production', 'Use for mobile game art, optimization, pipeline and team production examples.', 'Mobil oyun art, optimizasyon, pipeline ve ekip uretimi ornekleri icin.', 'project', 2026, null, '', '', 50, true),
  ('Motion / Broadcast Work', 'Motion / Broadcast Isleri', 'A flexible card for motion graphics, broadcast packages or older archive work.', 'Motion graphics, broadcast paketleri veya eski arsiv isleri icin.', 'project', 2026, null, '', '', 60, true)
on conflict do nothing;
