import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { colors, readingWidth, centerColumn } from '../../theme/tokens';
import { GuestBanner } from '../../components';
import { useStore } from '../../store';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

type Props = NativeStackScreenProps<ParamListBase>;

type Message = { who: 'cat' | 'me'; text: string };

const INITIAL: Message[] = [
  { who: 'cat', text: '안녕! 이 논문에 대해 뭐든 물어봐냥' },
  { who: 'cat', text: '예: "Attention이 뭐야?", "RNN이랑 뭐가 달라?"' },
];

const SUGGESTIONS = ['Attention이 뭐야?', 'Transformer 구조는?', '병렬 처리 원리', '인코더 디코더 차이', 'RNN과 뭐가 달라?'];

const FAKE_REPLIES: Record<string, string> = {
  'attention': 'Attention은 문장 안에서 어떤 단어가 어떤 단어와 관련이 있는지 그 가중치를 학습하는 메커니즘이야. 한 단어를 이해할 때 다른 모든 단어를 한 번에 보면서 "얘가 중요하구나" 가중치를 매기는 거지!',
  'transformer': 'Transformer는 Encoder와 Decoder 두 부분으로 구성돼. Encoder가 입력 문장 전체를 한 번에 이해하고, Decoder가 그걸 바탕으로 출력을 생성해. RNN과 달리 모든 위치를 동시에 처리해서 병렬 계산이 가능해!',
  'rnn':       'RNN은 한 글자씩 차례로 읽으면서 기억을 흘려보내는 방식이야. 길어지면 앞 정보를 잊어버려. Transformer는 모든 단어를 동시에 보니까 그런 문제가 없어!',
  'self':      '예를 들어 "그 고양이가 잤다" 문장에서 "잤다"의 주어인 "고양이"에 강한 attention 가중치가 생기는 식이야. 단어끼리 스스로 연관관계를 파악하니까 "Self"-Attention이라고 부르는 거야!',
  'multihead': 'Multi-Head Attention은 Attention을 여러 개 병렬로 실행하는 거야. 각 헤드가 다른 관점에서 단어 관계를 포착해. 어떤 헤드는 문법을 보고, 어떤 헤드는 의미를 보는 식이야!',
  'parallel':  'Transformer가 혁신적인 이유 중 하나가 병렬 처리야! RNN은 순서대로 처리해야 해서 GPU를 못 쓰지만, Transformer는 모든 단어를 동시에 처리하니까 학습이 훨씬 빨라져!',
  'positional': '단어 순서를 알려주는 장치야. Transformer는 순서를 모르니까, 각 단어에 위치 정보를 사인·코사인 함수로 인코딩해서 더해줘. "나는 밥을 먹었다"와 "밥을 나는 먹었다"를 구별할 수 있게 되는 거지!',
  'encoder':   'Encoder는 입력 문장을 의미 벡터로 압축해. 각 단어가 문장 전체 맥락을 담은 표현으로 변환돼. N번 쌓은 Encoder 레이어를 거쳐 풍부한 문맥 표현이 만들어지는 구조야!',
  'decoder':   'Decoder는 Encoder의 출력을 참고해서 결과를 생성해. 이미 생성된 토큰을 보면서(Masked Self-Attention) + Encoder 출력을 참고해서(Cross-Attention) 다음 토큰을 예측하는 방식이야!',
  'default':   '좋은 질문이냥! 핵심 포인트는 "어떤 단어가 어떤 단어와 관련이 깊은지 학습한다"는 거야. 더 구체적으로 물어봐줘냥!',
};

export default function QAChatbotScreen({ navigation }: Props) {
  const [state] = useStore();
  const [showGuest, setShowGuest] = useState(state.isGuest);
  const [messages, setMessages] = useState<Message[]>(INITIAL);
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const send = (raw?: string) => {
    const q = (raw ?? text).trim();
    if (!q) return;
    const next: Message[] = [...messages, { who: 'me', text: q }];
    setMessages(next);
    setText('');
    setTimeout(() => {
      const lower = q.toLowerCase();
      const reply =
        lower.includes('transformer') || lower.includes('트랜스포머') ? FAKE_REPLIES.transformer :
        lower.includes('multi') || lower.includes('헤드') || lower.includes('head') ? FAKE_REPLIES.multihead :
        lower.includes('attention') || lower.includes('어텐션') ? FAKE_REPLIES.attention :
        lower.includes('rnn') || lower.includes('lstm')         ? FAKE_REPLIES.rnn :
        lower.includes('self') || lower.includes('셀프')        ? FAKE_REPLIES.self :
        lower.includes('병렬') || lower.includes('parallel')    ? FAKE_REPLIES.parallel :
        lower.includes('포지셔널') || lower.includes('위치') || lower.includes('positional') ? FAKE_REPLIES.positional :
        lower.includes('인코더') || lower.includes('encoder')   ? FAKE_REPLIES.encoder :
        lower.includes('디코더') || lower.includes('decoder')   ? FAKE_REPLIES.decoder :
        FAKE_REPLIES.default;
      setMessages([...next, { who: 'cat', text: reply }]);
    }, 700);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Nav bar — hairline bottom, no box */}
      <View style={s.nav}>
        <Pressable style={s.back} onPress={() => navigation.goBack()}><Feather name="chevron-left" size={22} color={colors.ink} /></Pressable>
        <Image source={require('../../../assets/cat/concern.png')} style={{ width: 36, height: 36, marginRight: 8, resizeMode: 'contain' }} />
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Q&A 챗봇</Text>
          <Text style={s.sub}>식빵이가 답해줄게요</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={centerColumn}>
        <ScrollView ref={scrollRef} style={readingWidth} contentContainerStyle={{ padding: 16, paddingBottom: 8 }}>
          {messages.map((m, i) => (
            m.who === 'cat' ? (
              /* Bot message: cat image + text directly on bg, hairline border only */
              <View key={i} style={s.catRow}>
                <Image source={require('../../../assets/cat/concern.png')} style={{ width: 34, height: 34, resizeMode: 'contain' }} />
                <View style={s.catBubble}><Text style={s.catText}>{m.text}</Text></View>
              </View>
            ) : (
              /* User message: accent-tinted bg, right-aligned, no heavy border */
              <View key={i} style={s.meRow}>
                <View style={s.meBubble}><Text style={s.meText}>{m.text}</Text></View>
              </View>
            )
          ))}

          {/* Suggestions — monochrome letterspaced labels, no filled pill */}
          <View style={{ marginTop: 12 }}>
            <Text style={s.suggLabel}>이런 거 물어볼래냥?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SUGGESTIONS.map(t => (
                <Pressable key={t} onPress={() => send(t)} style={s.sugg}>
                  <Text style={s.suggText}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
        </View>

        <GuestBanner visible={showGuest} onClose={() => setShowGuest(false)} navigation={navigation} />
        {/* Input bar — hairline top, hairline-bordered input */}
        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            placeholder="궁금한 점을 적어줘냥"
            placeholderTextColor={colors.faint}
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => send()}
            returnKeyType="send"
          />
          <Pressable onPress={() => send()} style={s.sendBtn}>
            <Feather name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  /* Nav */
  nav:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  back:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'SUIT-Medium', fontWeight: undefined, fontSize: 16, color: colors.ink },
  sub:   { fontSize: 11, fontFamily: 'Pretendard-Regular', color: colors.muted, letterSpacing: 0.3 },

  /* Bot bubble: hairline border, no white card fill — quiet, borderless-ish */
  catRow:    { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 12 },
  catBubble: { borderWidth: 1, borderColor: colors.hairline, borderRadius: 14, borderBottomLeftRadius: 3, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '78%' },
  catText:   { fontSize: 14, fontFamily: 'Pretendard-Regular', color: colors.text, lineHeight: 21 },

  /* User bubble: accent background, white text, no border */
  meRow:    { alignItems: 'flex-end', marginBottom: 12 },
  meBubble: { backgroundColor: colors.accent, borderRadius: 14, borderBottomRightRadius: 3, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '78%' },
  meText:   { fontSize: 14, fontFamily: 'Pretendard-Regular', color: '#fff', lineHeight: 21 },

  /* Suggestion chips: 탭 가능한 둥근 pill (테두리 + 옅은 채움) */
  suggLabel: { fontSize: 10.5, fontFamily: 'SUIT-Medium', fontWeight: undefined, color: colors.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10, marginLeft: 2 },
  sugg:      { paddingVertical: 9, paddingHorizontal: 15, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cream },
  suggText:  { fontSize: 12.5, fontFamily: 'Pretendard-Regular', color: colors.text, letterSpacing: 0.2 },

  /* Input bar */
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.hairline, backgroundColor: colors.bg },
  input:    { flex: 1, height: 46, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.hairline, borderRadius: 10, fontSize: 14, fontFamily: 'Pretendard-Regular', color: colors.ink },
  sendBtn:  { width: 46, height: 46, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});
