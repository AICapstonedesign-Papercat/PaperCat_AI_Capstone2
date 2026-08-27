-- Shared cache for generate-overview's output ("핵심 구조 시각화" + "스토리텔링" +
-- "핵심 개념" on PaperDetailScreen). The content only depends on the paper itself
-- (title/year/category, already fixed per papers.id), not on who's asking, so the
-- first user to open a paper generates it via Gemini and every later user/session
-- reads the cached row instead of re-calling the model.
-- Safe to re-run: guarded with IF NOT EXISTS.

create table if not exists public.paper_overviews (
  paper_id          text primary key references public.papers(id) on delete cascade,
  groups            jsonb not null,   -- StructureGroup[] — [{ title, steps[] }, ...]
  story_paragraphs  jsonb not null,   -- string[]
  pull_quote        text  not null,
  concept_name      text  not null,
  why_it_matters    text  not null,
  created_at        timestamptz not null default now()
);

alter table public.paper_overviews enable row level security;

-- Public read, including guests — this is non-personalized shared content, same
-- access level as `papers` itself.
drop policy if exists "paper overviews are publicly readable" on public.paper_overviews;
create policy "paper overviews are publicly readable"
  on public.paper_overviews for select
  using (true);

-- No insert/update/delete policy for anon/authenticated: only the generate-overview
-- Edge Function writes here, using the service-role key (bypasses RLS). This keeps
-- clients from poisoning the shared cache with arbitrary content.
