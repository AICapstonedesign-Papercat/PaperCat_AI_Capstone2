import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../../theme/tokens';
import { GradeBadge } from '../../components';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

type Props = NativeStackScreenProps<ParamListBase>;

export const PAPERS = [
  { id: 'attention', grade: 'S',      cat: 'NLP',   title: 'Attention is All You Need',                           date: '2017.06.12', year: 2017, cites: '100k+', citesNum: 100, trending: false },
  { id: 'bert',      grade: 'Normal', cat: 'NLP',   title: 'BERT: Pre-training of Deep Bidirectional…',           date: '2018.10.11', year: 2018, cites: '80k+',  citesNum: 80,  trending: false },
  { id: 'resnet',    grade: 'S',      cat: 'CV',    title: 'Deep Residual Learning (ResNet)',                      date: '2015.12.10', year: 2015, cites: '200k+', citesNum: 200, trending: false },
  { id: 'vit',       grade: 'Normal', cat: 'CV',    title: 'Vision Transformer (ViT)',                             date: '2020.10.22', year: 2020, cites: '40k+',  citesNum: 40,  trending: true  },
  { id: 'gpt2',      grade: 'Normal', cat: 'NLP',   title: 'GPT-2: Language Models are Unsupervised…',            date: '2019.02.14', year: 2019, cites: '60k+',  citesNum: 60,  trending: true  },
  { id: 'dqn',       grade: 'Normal', cat: 'RL',    title: 'Playing Atari with Deep RL',                           date: '2013.12.19', year: 2013, cites: '20k+',  citesNum: 20,  trending: false },
  { id: 'diffusion', grade: 'Normal', cat: '생성AI', title: 'Denoising Diffusion Probabilistic Models',             date: '2020.06.19', year: 2020, cites: '18k+',  citesNum: 18,  trending: true  },
  { id: 'llama',     grade: 'Normal', cat: 'NLP',   title: 'LLaMA: Open and Efficient Foundation Language Models', date: '2023.02.27', year: 2023, cites: '10k+',  citesNum: 10,  trending: true  },
];

type Paper = (typeof PAPERS)[number];

const CATS = ['전체', 'NLP', 'CV', 'RL', '생성AI'];

export const GRADE_COLORS = {
  S:      { bg: colors.yellowBg, fg: colors.yellowText },
  Normal: { bg: colors.panel,    fg: colors.muted },
};

export default function ExploreScreen({ navigation }: Props) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('전체');
  const [mode, setMode] = useState('classic'); // 'classic' | 'trendy'

  const list = PAPERS
    .filter(p =>
      (mode === 'trendy' ? p.trending : true) &&
      (cat === '전체' || p.cat === cat) &&
      (q.trim() === '' || p.title.toLowerCase().includes(q.toLowerCase()))
    )
    .sort((a, b) => {
      if (mode === 'trendy') {
        const maxCites = 200;
        const score = (p: Paper) => (p.citesNum / maxCites) * 0.3 + ((p.year - 2010) / (2026 - 2010)) * 0.7;
        return score(b) - score(a);
      }
      return b.citesNum - a.citesNum;
    });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={s.h1}>탐색</Text>

        {/* Search */}
        <View style={s.search}>
          <Feather name="search" size={18} color={colors.muted} />
          <TextInput
            placeholder="논문 제목·저자·키워드"
            value={q} onChangeText={setQ}
            placeholderTextColor={colors.faint}
            style={s.searchInput}
          />
        </View>

        {/* Classic / Trendy — underline toggle */}
        <View style={s.modeTabsWrap}>
          <View style={{ flexDirection: 'row', gap: 22 }}>
            {[{ id: 'classic', label: 'CLASSIC', icon: 'award',       sub: '인용 100k+ → S등급\n그 이하 → Normal' },
              { id: 'trendy',  label: 'TRENDY',  icon: 'trending-up', sub: '연도 70% + 인용수 30%\n최신성 가중 랭킹' }].map(t => (
              <Pressable key={t.id} onPress={() => setMode(t.id)} style={[s.modeTab, mode === t.id ? s.modeTabOn : s.modeTabOff]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Feather name={t.icon} size={13} color={mode === t.id ? colors.accent : colors.muted} />
                  <Text style={[s.modeLabel, mode === t.id && s.modeLabelOn]}>{t.label}</Text>
                </View>
                <Text style={[s.modeSub, mode === t.id && s.modeSubOn]}>{t.sub}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Category — underline tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catTabsWrap}>
          <View style={{ flexDirection: 'row', gap: 22, paddingRight: 20 }}>
            {CATS.map(c => (
              <Pressable key={c} onPress={() => setCat(c)} style={[s.catTab, cat === c && s.catTabOn]}>
                <Text style={[s.catText, cat === c && s.catTextOn]}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* List */}
        {list.map((p, i) => (
          <Pressable key={p.id} onPress={() => navigation.navigate('PaperDetail', { paperId: p.id })}>
            <View style={[s.row, i > 0 && s.rowBorder]}>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 6, alignItems: 'center' }}>
                <GradeBadge grade={p.grade} />
                <Text style={s.catLabel}>{p.cat}</Text>
              </View>
              <Text style={s.title}>{p.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={s.meta}>{p.date} · 인용 </Text>
                <Text style={[s.meta, p.citesNum >= 100 && s.citesHot]}>{p.cites}</Text>
                {p.citesNum >= 100 && <Ionicons name="flame" size={14} color={colors.accent3} />}
              </View>
            </View>
          </Pressable>
        ))}

        {list.length === 0 && (
          <Text style={{ textAlign: 'center', color: colors.muted, marginTop: 40 }}>결과가 없어요</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  h1: { fontSize: 24, fontFamily: 'Pretendard-Bold', color: colors.ink, marginBottom: 16 },

  search: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    height: 48, paddingHorizontal: 0,
    borderBottomWidth: 1, borderColor: colors.hairline,
    marginBottom: 20,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Pretendard-Regular', color: colors.ink },

  modeTabsWrap: { borderBottomWidth: 1, borderColor: colors.hairline, marginBottom: 20 },
  modeTab:   { paddingBottom: 12, paddingRight: 20 },
  modeTabOn: { borderBottomWidth: 2, borderColor: colors.accent, marginBottom: -1 },
  modeTabOff: { opacity: 0.4 },
  modeLabel: { fontSize: 12, fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.muted, letterSpacing: 1.2, textTransform: 'uppercase' },
  modeLabelOn: { color: colors.ink, fontFamily: 'SUIT-Medium' },
  modeSub:   { fontSize: 11, fontFamily: 'Pretendard-Regular', color: colors.faint, lineHeight: 17 },
  modeSubOn: { color: colors.muted },

  catTabsWrap: { marginBottom: 22, borderBottomWidth: 1, borderColor: colors.hairline },
  catTab:    { paddingBottom: 10 },
  catTabOn:  { borderBottomWidth: 2, borderColor: colors.accent, marginBottom: -1 },
  catText:   { fontSize: 13, fontFamily: 'Pretendard-Medium', color: colors.muted, letterSpacing: 0.2 },
  catTextOn: { color: colors.ink },

  row:       { paddingVertical: 16 },
  rowBorder: { borderTopWidth: 1, borderColor: colors.hairline },

  catLabel: {
    fontSize: 10, fontFamily: 'SUIT-Medium', fontWeight: undefined,
    color: colors.muted, letterSpacing: 1.4, textTransform: 'uppercase',
  },

  title: { fontSize: 16, fontFamily: 'Pretendard-SemiBold', color: colors.ink, lineHeight: 22, marginBottom: 5 },
  citesHot: { color: colors.accent, fontFamily: 'SUIT-Medium' },
  meta:  { fontSize: 11.5, fontFamily: 'Pretendard-Regular', color: colors.muted, letterSpacing: 0 },
});
