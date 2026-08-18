-- Seeds `papers` with the 8 titles that used to be hard-coded in src/data/papers.ts.
-- Run after 0001_init.sql. Safe to re-run (upserts on id).

insert into public.papers (id, grade, cat, title, date_label, year, cites_label, cites_num, trending, ingest_status)
values
  ('attention', 'S',      'NLP',   'Attention is All You Need',                           '2017.06.12', 2017, '100k+', 100, false, 'ready'),
  ('bert',      'Normal', 'NLP',   'BERT: Pre-training of Deep Bidirectional…',           '2018.10.11', 2018, '80k+',  80,  false, 'pending'),
  ('resnet',    'S',      'CV',    'Deep Residual Learning (ResNet)',                     '2015.12.10', 2015, '200k+', 200, false, 'ready'),
  ('vit',       'Normal', 'CV',    'Vision Transformer (ViT)',                            '2020.10.22', 2020, '40k+',  40,  true,  'pending'),
  ('gpt2',      'Normal', 'NLP',   'GPT-2: Language Models are Unsupervised…',            '2019.02.14', 2019, '60k+',  60,  true,  'pending'),
  ('dqn',       'Normal', 'RL',    'Playing Atari with Deep RL',                          '2013.12.19', 2013, '20k+',  20,  false, 'pending'),
  ('diffusion', 'Normal', '생성AI', 'Denoising Diffusion Probabilistic Models',            '2020.06.19', 2020, '18k+',  18,  true,  'pending'),
  ('llama',     'Normal', 'NLP',   'LLaMA: Open and Efficient Foundation Language Models', '2023.02.27', 2023, '10k+',  10,  true,  'ready')
on conflict (id) do update set
  grade         = excluded.grade,
  cat           = excluded.cat,
  title         = excluded.title,
  date_label    = excluded.date_label,
  year          = excluded.year,
  cites_label   = excluded.cites_label,
  cites_num     = excluded.cites_num,
  trending      = excluded.trending,
  ingest_status = excluded.ingest_status;
