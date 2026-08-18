import { useEffect, useState } from 'react';
import { fetchPapers } from '../lib/db';
import { SUPABASE_CONFIGURED } from '../lib/supabase';

export type Paper = {
  id: string;
  grade: 'S' | 'Normal';
  cat: 'NLP' | 'CV' | 'RL' | '생성AI';
  title: string;
  date: string;
  year: number;
  cites: string;
  citesNum: number;
  trending: boolean;
};

// Used before the first Supabase response lands, and whenever .env isn't configured
// yet (see src/lib/supabase.ts) — keeps screens rendering instead of showing blanks.
export const FALLBACK_PAPERS: Paper[] = [
  { id: 'attention', grade: 'S',      cat: 'NLP',   title: 'Attention is All You Need',                           date: '2017.06.12', year: 2017, cites: '100k+', citesNum: 100, trending: false },
  { id: 'bert',      grade: 'Normal', cat: 'NLP',   title: 'BERT: Pre-training of Deep Bidirectional…',           date: '2018.10.11', year: 2018, cites: '80k+',  citesNum: 80,  trending: false },
  { id: 'resnet',    grade: 'S',      cat: 'CV',    title: 'Deep Residual Learning (ResNet)',                      date: '2015.12.10', year: 2015, cites: '200k+', citesNum: 200, trending: false },
  { id: 'vit',       grade: 'Normal', cat: 'CV',    title: 'Vision Transformer (ViT)',                             date: '2020.10.22', year: 2020, cites: '40k+',  citesNum: 40,  trending: true  },
  { id: 'gpt2',      grade: 'Normal', cat: 'NLP',   title: 'GPT-2: Language Models are Unsupervised…',            date: '2019.02.14', year: 2019, cites: '60k+',  citesNum: 60,  trending: true  },
  { id: 'dqn',       grade: 'Normal', cat: 'RL',    title: 'Playing Atari with Deep RL',                           date: '2013.12.19', year: 2013, cites: '20k+',  citesNum: 20,  trending: false },
  { id: 'diffusion', grade: 'Normal', cat: '생성AI', title: 'Denoising Diffusion Probabilistic Models',             date: '2020.06.19', year: 2020, cites: '18k+',  citesNum: 18,  trending: true  },
  { id: 'llama',     grade: 'Normal', cat: 'NLP',   title: 'LLaMA: Open and Efficient Foundation Language Models', date: '2023.02.27', year: 2023, cites: '10k+',  citesNum: 10,  trending: true  },
];

let cache: Paper[] | null = null;
let inflight: Promise<Paper[]> | null = null;
const listeners = new Set<(papers: Paper[]) => void>();

async function loadPapers(): Promise<Paper[]> {
  if (cache) return cache;
  if (!SUPABASE_CONFIGURED) {
    cache = FALLBACK_PAPERS;
    return cache;
  }
  if (!inflight) {
    inflight = fetchPapers()
      .then(papers => {
        cache = papers.length ? papers : FALLBACK_PAPERS;
        listeners.forEach(fn => fn(cache!));
        return cache;
      })
      .catch(err => {
        console.warn('[papers] Supabase 조회 실패 — 로컬 fallback 데이터 사용:', err);
        cache = FALLBACK_PAPERS;
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

// Call once (e.g. after login) to drop the cache and re-fetch — otherwise the
// module-level cache serves the same list for the lifetime of the app.
export function invalidatePapersCache() {
  cache = null;
}

export function usePapers(): { papers: Paper[]; loading: boolean } {
  const [papers, setPapers] = useState<Paper[]>(cache || FALLBACK_PAPERS);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let cancelled = false;
    loadPapers().then(p => {
      if (!cancelled) {
        setPapers(p);
        setLoading(false);
      }
    });
    const fn = (p: Paper[]) => { if (!cancelled) setPapers(p); };
    listeners.add(fn);
    return () => {
      cancelled = true;
      listeners.delete(fn);
    };
  }, []);

  return { papers, loading };
}

export function usePaper(id: string | undefined): { paper: Paper | undefined; loading: boolean } {
  const { papers, loading } = usePapers();
  return { paper: id ? papers.find(p => p.id === id) : undefined, loading };
}
