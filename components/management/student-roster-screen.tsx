import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import {
  useConsultantOverview,
  type TodayClass,
  type UnwrittenRecord,
  type WeekScheduleEntry,
} from '@/hooks/use-consultant-overview';
import { useManagementViewer } from '@/hooks/use-management-viewer';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/lib/auth-context';
import { getChatInbox, getStudents } from '@/lib/management-api';
import type { ChatInboxEntry, StudentSummary } from '@/lib/management-types';

const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토'];

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; students: StudentSummary[]; chatEntries: ChatInboxEntry[] };

type TodoItem =
  | { kind: 'unread'; key: string; entry: ChatInboxEntry }
  | { kind: 'unwritten'; key: string; record: UnwrittenRecord };

function formatLessonTime(time: string | null) {
  if (!time) return '';
  const [hStr, mStr] = time.split(':');
  const hour = Number(hStr);
  const minute = Number(mStr ?? '0');
  if (Number.isNaN(hour)) return time;
  const period = hour < 12 ? '오전' : '오후';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute ? `${period} ${hour12}시 ${minute}분` : `${period} ${hour12}시`;
}

function relativeDay(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 잔여 회차를 10칸 안팎의 게이지로 시각화 — 결제분(파랑)까지 채우고 초과분은 빨강. */
function CreditGauge({ granted, used }: { granted: number; used: number }) {
  const primary = useThemeColor({}, 'primary');
  const danger = useThemeColor({}, 'danger');
  const track = useThemeColor({}, 'surfaceSecondary');
  const segments = Math.max(granted, used, 1);

  return (
    <View style={styles.gaugeRow}>
      {Array.from({ length: segments }).map((_, i) => {
        let color = track;
        if (i < used) color = i < granted ? primary : danger;
        return <View key={i} style={[styles.gaugeSegment, { backgroundColor: color }]} />;
      })}
    </View>
  );
}

function StudentCard({ student, onPress }: { student: StudentSummary; onPress: () => void }) {
  const textSecondary = useThemeColor({}, 'textSecondary');
  const danger = useThemeColor({}, 'danger');
  const isStalled = student.status === '진행 정지';
  const remaining = student.balance.remaining;

  return (
    <Pressable onPress={onPress} style={styles.studentCardWrap}>
      {({ pressed }) => (
        <Card style={[styles.studentCard, pressed && styles.cardPressed]}>
          <View style={styles.studentTopRow}>
            <Avatar name={student.student_name} size={44} />
            <View style={styles.studentInfo}>
              <View style={styles.studentNameRow}>
                <ThemedText style={styles.studentName}>{student.student_name}</ThemedText>
                <ThemedText
                  style={[
                    styles.statusTag,
                    isStalled
                      ? { color: '#D97706', backgroundColor: 'rgba(217,119,6,0.10)' }
                      : { color: '#16A34A', backgroundColor: 'rgba(22,163,74,0.10)' },
                  ]}>
                  {isStalled ? '진행 정지' : '진행 중'}
                </ThemedText>
              </View>
              <ThemedText style={[styles.studentMeta, { color: textSecondary }]} numberOfLines={1}>
                {student.service_type ?? '종합 생기부 관리'}
                {student.consultantName ? ` · 담당 ${student.consultantName}` : ''}
              </ThemedText>
            </View>
            <View style={styles.remainingBox}>
              <ThemedText style={[styles.remainingLabel, { color: textSecondary }]}>잔여</ThemedText>
              <ThemedText style={[styles.remainingValue, remaining < 0 && { color: danger }]}>{remaining}회</ThemedText>
            </View>
          </View>
          <CreditGauge granted={student.balance.granted} used={student.balance.used} />
          <View style={styles.gaugeFooter}>
            <ThemedText style={[styles.gaugeFooterText, { color: textSecondary }]}>
              {student.balance.granted}회 결제 · {student.balance.used}회 진행
            </ThemedText>
            {remaining < 0 ? (
              <ThemedText style={[styles.gaugeFooterText, { color: danger, fontWeight: '700' }]}>
                {-remaining}회 초과
              </ThemedText>
            ) : null}
          </View>
        </Card>
      )}
    </Pressable>
  );
}

function GreetingHeader({
  name,
  dense,
  searchable,
  query,
  onQueryChange,
}: {
  name: string;
  dense?: boolean;
  searchable?: boolean;
  query?: string;
  onQueryChange?: (text: string) => void;
}) {
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');

  return (
    <View style={styles.greetingRow}>
      <ThemedText style={[styles.greetingText, dense && styles.greetingTextDense]}>
        안녕하세요{dense ? ' ' : '\n'}
        {name} 선생님
      </ThemedText>
      <View style={styles.greetingIcons}>
        {searchable ? (
          <View style={[styles.headerSearch, { backgroundColor: surface }]}>
            <Ionicons name="search" size={17} color={textTertiary} />
            <TextInput
              style={[styles.headerSearchInput, { color: text }]}
              value={query}
              onChangeText={onQueryChange}
              placeholder="학생 검색"
              placeholderTextColor={textTertiary}
            />
          </View>
        ) : (
          <Ionicons name="settings-outline" size={22} color={textSecondary} />
        )}
        <View style={[styles.headerIconButton, searchable && { backgroundColor: surface }]}>
          <Ionicons name="notifications-outline" size={20} color={textSecondary} />
        </View>
      </View>
    </View>
  );
}

function TodayClassHero({
  today,
  onWriteRecord,
  onOpenChat,
  compact,
}: {
  today: TodayClass | null;
  onWriteRecord: () => void;
  onOpenChat: () => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.hero, compact && styles.heroCompact]}>
      <View style={styles.heroTitleRow}>
        <Ionicons name="today-outline" size={16} color="#fff" />
        <ThemedText style={styles.heroTitle}>오늘 수업</ThemedText>
      </View>
      {today ? (
        <>
          <ThemedText style={styles.heroHeadline}>
            {formatLessonTime(today.reservation.lessonTime)} · {today.studentName}
          </ThemedText>
          <ThemedText style={styles.heroSubline}>
            {today.reservation.deductedRound}회차
            {today.reservation.title ? ` · ${today.reservation.title}` : ''}
          </ThemedText>
          <View style={styles.heroActions}>
            <Pressable style={styles.heroActionPrimary} onPress={onWriteRecord}>
              <ThemedText style={styles.heroActionPrimaryText}>수업 기록 쓰기</ThemedText>
            </Pressable>
            <Pressable style={styles.heroActionSecondary} onPress={onOpenChat}>
              <ThemedText style={styles.heroActionSecondaryText}>채팅 열기</ThemedText>
            </Pressable>
          </View>
        </>
      ) : (
        <ThemedText style={styles.heroEmpty}>오늘 예정된 수업이 없어요.</ThemedText>
      )}
    </View>
  );
}

function TodoSection({ items, onPress }: { items: TodoItem[]; onPress: (item: TodoItem) => void }) {
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const danger = useThemeColor({}, 'danger');
  const warning = useThemeColor({}, 'warning');

  if (items.length === 0) return null;

  return (
    <View style={styles.todoSection}>
      <ThemedText style={[styles.sectionLabel, { color: textSecondary }]}>할 일 {items.length}</ThemedText>
      <View style={styles.todoCard}>
        {items.map((item, index) => {
          const isUnread = item.kind === 'unread';
          const iconBg = isUnread ? 'rgba(220,38,38,0.10)' : 'rgba(217,119,6,0.10)';
          const iconColor = isUnread ? danger : warning;
          const title = isUnread
            ? `${item.entry.studentName} 메시지 ${item.entry.unreadCount}건 미확인`
            : `${item.record.studentName} 수업 기록 미작성`;
          const subtitle = isUnread
            ? relativeDay(item.entry.lastMessageAt ?? '')
            : `${relativeDay(item.record.reservation.lessonDate)} 수업 · 아직 기록되지 않았어요`;
          return (
            <View key={item.key}>
              {index > 0 ? <View style={styles.todoDivider} /> : null}
              <Pressable style={styles.todoRow} onPress={() => onPress(item)}>
                <View style={[styles.todoIcon, { backgroundColor: iconBg }]}>
                  <Ionicons name={isUnread ? 'chatbubble-ellipses-outline' : 'document-text-outline'} size={16} color={iconColor} />
                </View>
                <View style={styles.todoTextWrap}>
                  <ThemedText style={styles.todoTitle} numberOfLines={1}>
                    {title}
                  </ThemedText>
                  <ThemedText style={[styles.todoSubtitle, { color: textSecondary }]} numberOfLines={1}>
                    {subtitle}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={textTertiary} />
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function WeekSchedulePanel({ weekSchedule }: { weekSchedule: WeekScheduleEntry[] }) {
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const primary = useThemeColor({}, 'primary');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const countByDay = new Map<string, number>();
  for (const entry of weekSchedule) {
    const key = new Date(entry.reservation.lessonDate).toDateString();
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  }

  const upcoming = weekSchedule.slice(0, 2);

  return (
    <Card style={styles.panelCard}>
      <ThemedText style={[styles.sectionLabel, { color: textSecondary }]}>이번 주 일정</ThemedText>
      <View style={styles.weekRow}>
        {days.map((d, i) => {
          const isToday = d.toDateString() === today.toDateString();
          const count = countByDay.get(d.toDateString()) ?? 0;
          const bg = isToday ? primary : count > 0 ? 'rgba(40,113,230,0.22)' : surfaceSecondary;
          return (
            <View key={i} style={styles.weekDayCol}>
              <ThemedText style={[styles.weekDayLabel, { color: isToday ? primary : textTertiary }]}>
                {WEEKDAY_KR[d.getDay()]}
              </ThemedText>
              <View style={[styles.weekDayBar, { backgroundColor: bg }]} />
            </View>
          );
        })}
      </View>
      {upcoming.length === 0 ? (
        <ThemedText style={[styles.weekEmpty, { color: textSecondary }]}>이번 주 예정된 수업이 없어요.</ThemedText>
      ) : (
        upcoming.map((entry, index) => (
          <View key={entry.reservation.id}>
            {index > 0 ? <View style={styles.todoDivider} /> : null}
            <View style={styles.weekEntryRow}>
              <ThemedText style={[styles.weekEntryTime, { color: primary }]}>
                {relativeDay(entry.reservation.lessonDate)} {formatLessonTime(entry.reservation.lessonTime)}
              </ThemedText>
              <ThemedText style={[styles.weekEntryText, { color: textSecondary }]} numberOfLines={1}>
                {entry.studentName} {entry.reservation.deductedRound}회차
              </ThemedText>
            </View>
          </View>
        ))
      )}
    </Card>
  );
}

function ChatPreviewPanel({ entries, onPressEntry }: { entries: ChatInboxEntry[]; onPressEntry: (entry: ChatInboxEntry) => void }) {
  const textSecondary = useThemeColor({}, 'textSecondary');
  const primary = useThemeColor({}, 'primary');
  const danger = useThemeColor({}, 'danger');
  const totalUnread = entries.reduce((sum, e) => sum + e.unreadCount, 0);
  const preview = entries.slice(0, 4);

  return (
    <Card style={[styles.panelCard, styles.chatPanelCard]} padded={false}>
      <View style={styles.chatPanelHeader}>
        <ThemedText style={styles.chatPanelTitle}>채팅</ThemedText>
        {totalUnread > 0 ? (
          <ThemedText style={[styles.chatPanelUnread, { color: primary }]}>안 읽음 {totalUnread}</ThemedText>
        ) : null}
      </View>
      {preview.length === 0 ? (
        <ThemedText style={[styles.weekEmpty, { color: textSecondary, padding: Spacing.lg }]}>대화가 아직 없어요.</ThemedText>
      ) : (
        preview.map((entry) => (
          <Pressable key={entry.studentId} style={styles.chatPanelRow} onPress={() => onPressEntry(entry)}>
            <Avatar name={entry.studentName} size={40} />
            <View style={styles.chatPanelTextWrap}>
              <View style={styles.chatPanelNameRow}>
                <ThemedText style={styles.chatPanelName} numberOfLines={1}>
                  {entry.studentName}
                </ThemedText>
                {entry.unreadCount > 0 ? (
                  <View style={[styles.chatPanelBadge, { backgroundColor: danger }]}>
                    <ThemedText style={styles.chatPanelBadgeText}>{entry.unreadCount}</ThemedText>
                  </View>
                ) : null}
              </View>
              <ThemedText style={[styles.chatPanelPreview, { color: textSecondary }]} numberOfLines={1}>
                {entry.lastMessagePreview ?? '대화를 시작해보세요.'}
              </ThemedText>
            </View>
          </Pressable>
        ))
      )}
    </Card>
  );
}

/** 컨설턴트(담당 학생) / 실장(전체 학생) 홈. 오늘 수업·할 일 요약 위, 학생 명부는 화면 폭에 맞춰 1~3열 그리드. */
export function StudentRosterScreen({ isManager = false }: { isManager?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const background = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const breakpoint = useBreakpoint();
  const { profile } = useAuth();
  const viewerState = useManagementViewer();
  const consultantName =
    (viewerState.status === 'ready' ? viewerState.viewer.consultantName : null) ?? profile?.name ?? '컨설턴트';

  const students = state.status === 'ready' ? state.students : null;
  const overview = useConsultantOverview(students);

  const load = useCallback(async () => {
    try {
      const [{ students }, { entries }] = await Promise.all([getStudents(), getChatInbox()]);
      setState({ status: 'ready', students, chatEntries: entries });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : '불러오지 못했습니다.',
      });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([load(), overview.reload()]);
    setRefreshing(false);
  }

  function goToStudent(studentId: string) {
    router.push({ pathname: '/student/[id]', params: { id: studentId } });
  }

  function goToChat(studentId: string) {
    router.push({ pathname: '/chat/[studentId]', params: { studentId } });
  }

  function handleTodoPress(item: TodoItem) {
    if (item.kind === 'unread') goToChat(item.entry.studentId);
    else goToStudent(item.record.studentId);
  }

  if (state.status === 'loading') {
    return (
      <View style={[styles.center, { backgroundColor: background }]}>
        <ActivityIndicator color={primary} />
      </View>
    );
  }

  if (state.status === 'error') {
    return <StatusMessage message={state.message} onRetry={load} />;
  }

  const todoItems: TodoItem[] = [
    ...state.chatEntries
      .filter((e) => e.unreadCount > 0)
      .map((entry): TodoItem => ({ kind: 'unread', key: `unread-${entry.studentId}`, entry })),
    ...(overview.status === 'ready'
      ? overview.data.unwrittenRecords.map(
          (record): TodoItem => ({ kind: 'unwritten', key: `unwritten-${record.reservation.id}`, record })
        )
      : []),
  ].slice(0, 6);

  const todayClass = overview.status === 'ready' ? overview.data.todayClass : null;
  const numColumns = breakpoint === 'desktop' ? 3 : breakpoint === 'tablet' ? 2 : 1;
  const isWide = breakpoint !== 'mobile';
  const visibleStudents = query.trim()
    ? state.students.filter((s) => s.student_name.toLowerCase().includes(query.trim().toLowerCase()))
    : state.students;

  const header = (
    <View style={styles.headerBlock}>
      <GreetingHeader
        name={consultantName}
        dense={breakpoint === 'desktop'}
        searchable={isWide}
        query={query}
        onQueryChange={setQuery}
      />
      <TodayClassHero
        today={todayClass}
        onWriteRecord={() => todayClass && goToStudent(todayClass.studentId)}
        onOpenChat={() => todayClass && goToChat(todayClass.studentId)}
        compact={isWide}
      />
      <TodoSection items={todoItems} onPress={handleTodoPress} />
      <View style={styles.rosterHeaderRow}>
        <ThemedText style={[styles.sectionLabel, { color: textSecondary }]}>
          담당 학생 {visibleStudents.length}
        </ThemedText>
        {isManager ? (
          <Pressable onPress={() => router.push('/admin')} style={styles.consoleButton} hitSlop={8}>
            <Ionicons name="settings-outline" size={20} color={textSecondary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const roster = (
    <FlatList
      key={numColumns}
      style={{ backgroundColor: background, flex: 1 }}
      data={visibleStudents}
      numColumns={numColumns}
      columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primary} />}
      ListHeaderComponent={header}
      ItemSeparatorComponent={numColumns === 1 ? () => <View style={{ height: Spacing.md }} /> : undefined}
      renderItem={({ item }) => (
        <View style={numColumns > 1 ? styles.gridItem : undefined}>
          <StudentCard student={item} onPress={() => goToStudent(item.id)} />
        </View>
      )}
      ListEmptyComponent={
        <ThemedText style={[styles.empty, { color: textSecondary }]}>
          {query.trim() ? '검색 결과가 없어요.' : '담당하는 학생이 아직 없어요.'}
        </ThemedText>
      }
    />
  );

  if (breakpoint !== 'desktop') {
    return roster;
  }

  return (
    <View style={[styles.desktopRow, { backgroundColor: background }]}>
      <View style={styles.desktopMain}>{roster}</View>
      <View style={styles.desktopRail}>
        {overview.status === 'ready' ? <WeekSchedulePanel weekSchedule={overview.data.weekSchedule} /> : null}
        <ChatPreviewPanel entries={state.chatEntries} onPressEntry={(entry) => goToChat(entry.studentId)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: Spacing.xl, paddingTop: Spacing.xxxl + 20, paddingBottom: 60, flexGrow: 1 },
  headerBlock: { gap: Spacing.lg, marginBottom: Spacing.lg },

  greetingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  greetingText: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, lineHeight: 30 },
  greetingTextDense: { fontSize: 22 },
  greetingIcons: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    height: 40,
    paddingHorizontal: Spacing.md,
    width: 230,
  },
  headerSearchInput: { flex: 1, fontSize: 14, height: '100%' },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hero: {
    backgroundColor: '#2871E6',
    borderRadius: 20,
    padding: 18,
  },
  heroCompact: { padding: 22 },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  heroTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  heroHeadline: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  heroSubline: { color: 'rgba(255,255,255,0.82)', fontSize: 13.5, fontWeight: '500' },
  heroEmpty: { color: 'rgba(255,255,255,0.9)', fontSize: 14.5, fontWeight: '600', paddingVertical: 4 },
  heroActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  heroActionPrimary: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroActionPrimaryText: { color: '#2871E6', fontSize: 14, fontWeight: '700' },
  heroActionSecondary: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroActionSecondaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  sectionLabel: { fontSize: 12, fontWeight: '700' },
  todoSection: { gap: Spacing.sm },
  todoCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  todoRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14 },
  todoIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  todoTextWrap: { flex: 1, minWidth: 0 },
  todoTitle: { fontSize: 14, fontWeight: '700' },
  todoSubtitle: { fontSize: 12.5, marginTop: 1 },
  todoDivider: { height: 1, backgroundColor: 'rgba(17,24,39,0.06)', marginLeft: 55 },

  rosterHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  consoleButton: { padding: 4 },

  columnWrapper: { gap: Spacing.md },
  gridItem: { flex: 1, minWidth: 0 },

  studentCardWrap: { flex: 1 },
  studentCard: { gap: Spacing.md },
  cardPressed: { opacity: 0.85 },
  studentTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  studentInfo: { flex: 1, minWidth: 0 },
  studentNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' },
  studentName: { fontSize: 16, fontWeight: '700' },
  statusTag: { fontSize: 11, fontWeight: '700', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden' },
  studentMeta: { fontSize: 12.5 },
  remainingBox: { alignItems: 'flex-end' },
  remainingLabel: { fontSize: 11.5, marginBottom: 1 },
  remainingValue: { fontSize: 17, fontWeight: '800', letterSpacing: -0.4 },

  gaugeRow: { flexDirection: 'row', gap: 3 },
  gaugeSegment: { flex: 1, height: 7, borderRadius: 2 },
  gaugeFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  gaugeFooterText: { fontSize: 11.5 },

  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },

  panelCard: { gap: Spacing.md },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  weekDayCol: { alignItems: 'center', width: 32, gap: 6 },
  weekDayLabel: { fontSize: 11 },
  weekDayBar: { width: '100%', height: 30, borderRadius: 8 },
  weekEmpty: { fontSize: 13 },
  weekEntryRow: { gap: 2, paddingVertical: 4 },
  weekEntryTime: { fontSize: 13, fontWeight: '700' },
  weekEntryText: { fontSize: 13 },

  chatPanelCard: { flex: 1, overflow: 'hidden' },
  chatPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(17,24,39,0.06)',
  },
  chatPanelTitle: { fontSize: 14.5, fontWeight: '800' },
  chatPanelUnread: { fontSize: 12, fontWeight: '700' },
  chatPanelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md },
  chatPanelTextWrap: { flex: 1, minWidth: 0 },
  chatPanelNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  chatPanelName: { fontSize: 14.5, fontWeight: '700', flexShrink: 1 },
  chatPanelPreview: { fontSize: 13 },
  chatPanelBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  chatPanelBadgeText: { color: '#fff', fontSize: 10.5, fontWeight: '700' },

  desktopRow: { flex: 1, flexDirection: 'row' },
  desktopMain: { flex: 1.6, minWidth: 0 },
  desktopRail: { flex: 1, minWidth: 300, maxWidth: 380, padding: Spacing.xl, gap: Spacing.lg },
});
