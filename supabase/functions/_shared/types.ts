// Matches src/data/papers.ts's `Paper` shape — the client sends this along with
// every AI request so the model has context (title/year/category/grade).
// The `papers` table has no abstract/full-text column yet, so prompts lean on
// the model's own knowledge of well-known papers. If you later add real paper
// content (e.g. an `abstract` or `content` column), thread it through here and
// into each function's prompt for grounded answers instead.
export type PaperContext = {
  id: string;
  title: string;
  year: number;
  cat: 'NLP' | 'CV' | 'RL' | '생성AI';
  grade: 'S' | 'Normal';
};
