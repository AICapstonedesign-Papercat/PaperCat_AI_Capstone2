import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { colors, readingWidth, centerColumn } from '../../theme/tokens';
import { GuestBanner } from '../../components';
import { useStore } from '../../store';
import { usePaper } from '../../data/papers';
import { askPaperQuestion, toPaperContext } from '../../lib/ai';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

type Props = NativeStackScreenProps<ParamListBase>;

type Message = { who: 'cat' | 'me'; text: string };

const INITIAL: Message[] = [
  { who: 'cat', text: '안녕! 이 논문에 대해 뭐든 물어봐냥' },
  { who: 'cat', text: '예: "핵심 아이디어가 뭐야?", "어떤 문제를 풀어?"' },
];

const SUGGESTIONS = ['핵심 아이디어가 뭐야?', '어떤 문제를 풀어?', '이전 방법이랑 뭐가 달라?', '왜 중요한 논문이야?', '한계점은 뭐야?'];

export default function QAChatbotScreen({ navigation, route }: Props) {
  const paperId = (route?.params as any)?.paperId || 'attention';
  const { paper } = usePaper(paperId);
  const [state] = useStore();
  const [showGuest, setShowGuest] = useState(state.isGuest);
  const [messages, setMessages] = useState<Message[]>(INITIAL);
  const [text, setText] = useState('');
  const [asking, setAsking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const send = async (raw?: string) => {
    const q = (raw ?? text).trim();
    if (!q || asking || !paper) return;
    const next: Message[] = [...messages, { who: 'me', text: q }];
    setMessages(next);
    setText('');
    setAsking(true);
    try {
      const answer = await askPaperQuestion(toPaperContext(paper), q, next);
      setMessages([...next, { who: 'cat', text: answer }]);
    } catch (err) {
      console.warn('[QAChatbot] askPaperQuestion 실패:', err);
      setMessages([...next, { who: 'cat', text: '앗, 지금 대답을 못 가져왔어냥. 잠시 후 다시 물어봐줘냥' }]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Nav bar — hairline bottom, no box */}
      <View style={s.nav}>
        <Pressable style={s.back} onPress={() => navigation.goBack()}><Feather name="chevron-left" size={22} color={colors.ink} /></Pressable>
        <Image source={require('../../../assets/cat/study_with_ipad_right.png')} style={{ width: 36, height: 36, marginRight: 8, resizeMode: 'contain' }} />
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
                <Image source={require('../../../assets/cat/study_with_ipad_right.png')} style={{ width: 34, height: 34, resizeMode: 'contain' }} />
                <View style={s.catBubble}><Text style={s.catText}>{m.text}</Text></View>
              </View>
            ) : (
              /* User message: accent-tinted bg, right-aligned, no heavy border */
              <View key={i} style={s.meRow}>
                <View style={s.meBubble}><Text style={s.meText}>{m.text}</Text></View>
              </View>
            )
          ))}

          {asking && (
            <View style={s.catRow}>
              <Image source={require('../../../assets/cat/study_with_ipad_right.png')} style={{ width: 34, height: 34, resizeMode: 'contain' }} />
              <View style={s.catBubble}><ActivityIndicator size="small" color={colors.muted} /></View>
            </View>
          )}

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
            editable={!asking}
          />
          <Pressable onPress={() => send()} style={[s.sendBtn, asking && { opacity: 0.5 }]} disabled={asking}>
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
