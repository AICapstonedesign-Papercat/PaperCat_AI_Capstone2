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

export const PAPERS: Paper[] = [
  { id: 'attention', grade: 'S',      cat: 'NLP',   title: 'Attention is All You Need',                           date: '2017.06.12', year: 2017, cites: '100k+', citesNum: 100, trending: false },
  { id: 'bert',      grade: 'Normal', cat: 'NLP',   title: 'BERT: Pre-training of Deep Bidirectional…',           date: '2018.10.11', year: 2018, cites: '80k+',  citesNum: 80,  trending: false },
  { id: 'resnet',    grade: 'S',      cat: 'CV',    title: 'Deep Residual Learning (ResNet)',                      date: '2015.12.10', year: 2015, cites: '200k+', citesNum: 200, trending: false },
  { id: 'vit',       grade: 'Normal', cat: 'CV',    title: 'Vision Transformer (ViT)',                             date: '2020.10.22', year: 2020, cites: '40k+',  citesNum: 40,  trending: true  },
  { id: 'gpt2',      grade: 'Normal', cat: 'NLP',   title: 'GPT-2: Language Models are Unsupervised…',            date: '2019.02.14', year: 2019, cites: '60k+',  citesNum: 60,  trending: true  },
  { id: 'dqn',       grade: 'Normal', cat: 'RL',    title: 'Playing Atari with Deep RL',                           date: '2013.12.19', year: 2013, cites: '20k+',  citesNum: 20,  trending: false },
  { id: 'diffusion', grade: 'Normal', cat: '생성AI', title: 'Denoising Diffusion Probabilistic Models',             date: '2020.06.19', year: 2020, cites: '18k+',  citesNum: 18,  trending: true  },
  { id: 'llama',     grade: 'Normal', cat: 'NLP',   title: 'LLaMA: Open and Efficient Foundation Language Models', date: '2023.02.27', year: 2023, cites: '10k+',  citesNum: 10,  trending: true  },
];

