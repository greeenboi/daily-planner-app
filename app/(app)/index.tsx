import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { StyleSheet, View, ScrollView, Text, Pressable, Platform } from 'react-native';
import { authClient } from '@/lib/auth-client';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { 
	Modal,
	ModalBackdrop,
	ModalContent,
	ModalHeader,
	ModalBody,
	ModalFooter,
	ModalCloseButton,
} from '@/components/ui/modal';
import { Input, InputField } from '@/components/ui/input';
import { Text as GSText } from '@/components/ui/text';
import { CalendarDaysIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, ChevronDownIcon, AddIcon } from '@/components/ui/icon';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface PlannerTask {
	id: string;
	title: string;
	start: string; // ISO
	end: string;   // ISO
	color?: string | null;
	allDay?: boolean;
	priority?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function DailyPlannerPage() {
	const { data: session } = authClient.useSession();
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [tasks, setTasks] = useState<PlannerTask[]>([]);
	const [loading, setLoading] = useState(false);
	const [createOpen, setCreateOpen] = useState(false);
	const [newTitle, setNewTitle] = useState('');
	const [startTime, setStartTime] = useState(new Date());
	const [endTime, setEndTime] = useState(new Date(Date.now() + 30 * 60 * 1000));
	const fetchIdRef = useRef(0);

	// unified picker state
	const [pickerVisible, setPickerVisible] = useState(false);
	const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
	const [pickerTarget, setPickerTarget] = useState<'date' | 'start' | 'end'>('date');

	console.log(session)

	const logRef = useRef<((...args: unknown[]) => void) | undefined>(undefined);
	if (!logRef.current) {
		logRef.current = (...args: unknown[]) => {
			// eslint-disable-next-line no-console
			console.log('[DailyPlanner]', ...args);
		};
	}
	const log = logRef.current;

	// Fetch tasks for selected date
	const fetchTasks = useCallback(async () => {
		if (!session?.user) {
			log('Skip fetch: no session');
			return;
		}
		const currentFetchId = ++fetchIdRef.current;
		setLoading(true);
		const iso = selectedDate.toISOString().slice(0,10);
		log('Fetching tasks for date', iso, 'user', session.user.id, 'fetchId', currentFetchId);
		try {
			const authHeader: Record<string,string> = {};
			try {
				// attempt to read better-auth token from secure store (prefix used in config)
				// @ts-ignore (global SecureStore not typed here) dynamic import to avoid platform issues
				const SecureStore = await import('expo-secure-store');
				const token = await SecureStore.getItemAsync?.('withbetterauth:access_token');
				if (token) authHeader.Authorization = `Bearer ${token}`;
			} catch {}
			const res = await fetch(`/api/tasks?date=${iso}` , { credentials: 'include', headers: authHeader });
			let json: { tasks?: PlannerTask[] } = {};
			try { json = (await res.json()) as { tasks?: PlannerTask[] }; } catch (e) { log('Failed to parse JSON', e); }
			log('Fetch response', { status: res.status, fetchId: currentFetchId, count: json.tasks ? json.tasks.length : 0 });
			if (fetchIdRef.current !== currentFetchId) {
				log('Stale fetch ignored', currentFetchId, 'latest', fetchIdRef.current);
				return;
			}
			if (res.ok) {
				setTasks(Array.isArray(json.tasks) ? json.tasks : []);
			} else log('Fetch not ok', json);
		} catch (e) {
			log('Fetch error', e);
		} finally {
			setLoading(false);
		}
	}, [session?.user, selectedDate, log]);

	useEffect(() => { fetchTasks(); }, [fetchTasks]);

	const grouped = useMemo(() => {
		const map: Record<number, PlannerTask[]> = {};
		for (const t of tasks) {
			const hour = new Date(t.start).getHours();
			if (!map[hour]) map[hour] = [];
			map[hour].push(t);
		}
		log('Grouped tasks snapshot', Object.keys(map).length, 'hours populated');
		return map;
	}, [tasks, log]);

	const createTask = async () => {
		if (!newTitle.trim()) {
			log('Create blocked: empty title');
			return;
		}
		const body = {
			title: newTitle.trim(),
			start: startTime.toISOString(),
			end: endTime.toISOString(),
		};
		log('Creating task', body);
		try {
			const authHeader: Record<string,string> = { 'Content-Type': 'application/json' };
			try {
				const SecureStore = await import('expo-secure-store');
				const token = await SecureStore.getItemAsync?.('withbetterauth:access_token');
				if (token) authHeader.Authorization = `Bearer ${token}`;
			} catch {}
			const res = await fetch('/api/tasks', { method: 'POST', credentials: 'include', headers: authHeader, body: JSON.stringify(body) });
			let json: { task?: PlannerTask } = {};
			try { json = (await res.json()) as { task?: PlannerTask }; } catch {}
			if (res.ok && json.task) {
				log('Create success', json.task.id);
				setNewTitle('');
				setCreateOpen(false);
				fetchTasks();
			} else {
				log('Create failed', res.status, json);
			}
		} catch (e) {
			log('Create error', e);
		}
	};

	const dateLabel = selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

	function openPicker(target: 'date' | 'start' | 'end', mode: 'date' | 'time') {
		setPickerTarget(target);
		setPickerMode(mode);
		setPickerVisible(true);
		log('Open picker', target, mode);
	}

	function onPickerChange(event: DateTimePickerEvent, date?: Date) {
		log('Picker change event', event.type, pickerTarget, pickerMode, date?.toISOString());
		if (event.type === 'dismissed') {
			setPickerVisible(false);
			return;
		}
		if (date) {
			if (pickerTarget === 'date') {
				// keep existing hours in start/end
				setSelectedDate(new Date(date));
			} else if (pickerTarget === 'start') {
				setStartTime(prev => {
					const d = new Date(prev);
					d.setHours(date.getHours(), date.getMinutes(), 0, 0);
					return d;
				});
			} else if (pickerTarget === 'end') {
				setEndTime(prev => {
					const d = new Date(prev);
					d.setHours(date.getHours(), date.getMinutes(), 0, 0);
					return d;
				});
			}
		}
		if (Platform.OS !== 'ios') {
			setPickerVisible(false);
		}
	}

	return (
		<View style={styles.root}>
			<HStack style={styles.header}>
				<Heading size="xl">Daily Plan {loading ? '…' : ''}</Heading>
				<View style={{ flex: 1 }} />
				<Button onPress={() => authClient.signOut()}><ButtonText>Sign out</ButtonText></Button>
			</HStack>
			<VStack style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
				<GSText size="sm" style={{ opacity: 0.8 }}>Welcome {session?.user?.name}</GSText>
				<GSText>{dateLabel}</GSText>
			</VStack>
			<View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
					<View style={styles.datePickerShell}>
						<View style={styles.datePickerHeader}>
							<CalendarDaysIcon width={16} height={16} />
						<GSText size="sm" style={{ opacity: 0.7 }}>Select Day</GSText>
					</View>
					<HStack style={{ alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
							<Button size='xs' variant='outline' action='secondary' onPress={() => { setSelectedDate(d => { const nd = new Date(d.getTime() - 86400000); log('Date prev', nd); return nd; }); }}>
								<ChevronLeftIcon width={16} height={16} />
						</Button>
						<Pressable onPress={() => openPicker('date','date')} style={styles.dateCenterWrap}>
							<Text style={styles.dateCenterText}>{dateLabel}</Text>
						</Pressable>
							<Button size='xs' variant='outline' action='secondary' onPress={() => { setSelectedDate(d => { const nd = new Date(d.getTime() + 86400000); log('Date next', nd); return nd; }); }}>
								<ChevronRightIcon width={16} height={16} />
						</Button>
					</HStack>
				</View>
			</View>

			<ScrollView contentContainerStyle={styles.timelineContainer}>
				{HOURS.map(h => {
					const hourTasks = grouped[h] || [];
					return (
						<View key={h} style={styles.hourRow}>
							<View style={styles.hourLabel}><Text style={styles.hourLabelText}>{h.toString().padStart(2,'0')}:00</Text></View>
							<View style={styles.hourContent}>
								{hourTasks.map(t => {
									const start = new Date(t.start);
									const end = new Date(t.end);
									const durMin = Math.max(15, (end.getTime() - start.getTime()) / 60000);
									return (
										<Pressable key={t.id} style={[styles.taskBlock, { height: Math.min(180, (durMin/60) * 80), backgroundColor: t.color || '#2563eb22', borderLeftColor: t.color || '#2563eb' }]}> 
											<Text numberOfLines={2} style={styles.taskTitle}>{t.title}</Text>
											<Text style={styles.taskTime}>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
										</Pressable>
									);
								})}
							</View>
						</View>
					);
				})}
				<View style={{ height: 64 }} />
			</ScrollView>

			<Pressable style={styles.fab} onPress={() => {
				const now = new Date();
				log('FAB pressed; open create modal with base times', now);
				setStartTime(now);
				setEndTime(new Date(now.getTime()+30*60000));
				setCreateOpen(true);
			}}>
				<AddIcon width={28} height={28} />
			</Pressable>

			<Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} size="md">
				<ModalBackdrop />
				<ModalContent>
					<ModalHeader>
						<Heading size="md">New Task</Heading>
						<ModalCloseButton />
					</ModalHeader>
					<ModalBody>
						<VStack space="md">
							<Input variant="outline" size="md">
								<InputField
									placeholder="Title"
									value={newTitle}
									onChangeText={setNewTitle}
									autoFocus
								/>
							</Input>
							<View style={styles.timePickerShell}>
								<View style={styles.timePickerHeader}>
									<ClockIcon width={16} height={16} />
									<GSText size='sm' style={{ opacity: 0.7 }}>Start / End</GSText>
								</View>
								<HStack style={styles.dualTimeRow}>
									<View style={styles.singleTimeCol}>
										<GSText size='xs' style={{ opacity: 0.6 }}>Start</GSText>
										<HStack style={styles.spinRow}>
											<Button size='xs' variant='link' action='secondary' onPress={() => setStartTime(t => { const nd = new Date(t.getTime() - 60*60000); log('Start -1h', nd); return nd; })}><ChevronUpIcon width={14} height={14} /></Button>
											<Text style={styles.spinTime}>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
											<Button size='xs' variant='link' action='secondary' onPress={() => setStartTime(t => { const nd = new Date(t.getTime() + 60*60000); log('Start +1h', nd); return nd; })}><ChevronDownIcon width={14} height={14} /></Button>
											<Button size='xs' variant='outline' action='secondary' onPress={() => openPicker('start','time')}><ButtonText>Pick</ButtonText></Button>
										</HStack>
										<HStack style={styles.minAdjustRow}>
											<Button size='xs' variant='outline' action='secondary' onPress={() => setStartTime(t => { const nd = new Date(t.getTime() - 15*60000); log('Start -15m', nd); return nd; })}><ButtonText>-15</ButtonText></Button>
											<Button size='xs' variant='outline' action='secondary' onPress={() => setStartTime(t => { const nd = new Date(t.getTime() - 5*60000); log('Start -5m', nd); return nd; })}><ButtonText>-5</ButtonText></Button>
											<Button size='xs' variant='outline' action='secondary' onPress={() => setStartTime(t => { const nd = new Date(t.getTime() + 5*60000); log('Start +5m', nd); return nd; })}><ButtonText>+5</ButtonText></Button>
											<Button size='xs' variant='outline' action='secondary' onPress={() => setStartTime(t => { const nd = new Date(t.getTime() + 15*60000); log('Start +15m', nd); return nd; })}><ButtonText>+15</ButtonText></Button>
										</HStack>
									</View>
									<View style={styles.singleTimeCol}>
										<GSText size='xs' style={{ opacity: 0.6 }}>End</GSText>
										<HStack style={styles.spinRow}>
											<Button size='xs' variant='link' action='secondary' onPress={() => setEndTime(t => { const nd = new Date(t.getTime() - 60*60000); log('End -1h', nd); return nd; })}><ChevronUpIcon width={14} height={14} /></Button>
											<Text style={styles.spinTime}>{endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
											<Button size='xs' variant='link' action='secondary' onPress={() => setEndTime(t => { const nd = new Date(t.getTime() + 60*60000); log('End +1h', nd); return nd; })}><ChevronDownIcon width={14} height={14} /></Button>
											<Button size='xs' variant='outline' action='secondary' onPress={() => openPicker('end','time')}><ButtonText>Pick</ButtonText></Button>
										</HStack>
										<HStack style={styles.minAdjustRow}>
											<Button size='xs' variant='outline' action='secondary' onPress={() => setEndTime(t => { const nd = new Date(t.getTime() - 15*60000); log('End -15m', nd); return nd; })}><ButtonText>-15</ButtonText></Button>
											<Button size='xs' variant='outline' action='secondary' onPress={() => setEndTime(t => { const nd = new Date(t.getTime() - 5*60000); log('End -5m', nd); return nd; })}><ButtonText>-5</ButtonText></Button>
											<Button size='xs' variant='outline' action='secondary' onPress={() => setEndTime(t => { const nd = new Date(t.getTime() + 5*60000); log('End +5m', nd); return nd; })}><ButtonText>+5</ButtonText></Button>
											<Button size='xs' variant='outline' action='secondary' onPress={() => setEndTime(t => { const nd = new Date(t.getTime() + 15*60000); log('End +15m', nd); return nd; })}><ButtonText>+15</ButtonText></Button>
										</HStack>
									</View>
								</HStack>
							</View>
						</VStack>
					</ModalBody>
					<ModalFooter>
						<HStack space='sm'>
							<Button variant='outline' action='secondary' onPress={() => setCreateOpen(false)}>
								<ButtonText>Cancel</ButtonText>
							</Button>
							<Button onPress={createTask} isDisabled={!newTitle.trim()}>
								<ButtonText>Create</ButtonText>
							</Button>
						</HStack>
					</ModalFooter>
				</ModalContent>
			</Modal>

			{pickerVisible && (
				<View style={styles.pickerPortal}>
					{Platform.OS === 'ios' && (
						<View style={styles.iosPickerCard}>
							<View style={styles.iosPickerHeader}>
								<Text style={styles.iosPickerTitle}>{pickerTarget === 'date' ? 'Select Date' : pickerTarget === 'start' ? 'Start Time' : 'End Time'}</Text>
								<Button size='xs' variant='outline' action='secondary' onPress={() => { setPickerVisible(false); log('Picker done'); }}>
									<ButtonText>Done</ButtonText>
								</Button>
							</View>
							<DateTimePicker
								value={pickerTarget === 'date' ? selectedDate : pickerTarget === 'start' ? startTime : endTime}
								mode={pickerMode}
								is24Hour
								display='spinner'
								onChange={onPickerChange}
							/>
						</View>
					)}
					{Platform.OS !== 'ios' && (
						<DateTimePicker
							value={pickerTarget === 'date' ? selectedDate : pickerTarget === 'start' ? startTime : endTime}
							mode={pickerMode}
							is24Hour
							display='default'
							onChange={onPickerChange}
						/>
					)}
				</View>
			)}
		</View>
	);
}

// Inline picker overlay (outside component return earlier) intentionally omitted; integrated inside component return below if needed.

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: '#0c0f14' },
	header: { paddingTop: 52, paddingHorizontal: 16, alignItems: 'center' },
	timelineContainer: { paddingBottom: 120 },
	hourRow: { flexDirection: 'row', minHeight: 80, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#262b33' },
	hourLabel: { width: 54, alignItems: 'flex-end', paddingRight: 8, paddingTop: 6 },
	hourLabelText: { color: '#64748b', fontSize: 11 },
	hourContent: { flex: 1, padding: 4, gap: 6 },
	taskBlock: { borderRadius: 10, padding: 8, backgroundColor: '#1e293b', borderLeftWidth: 4, gap: 4 },
	taskTitle: { color: 'white', fontSize: 13, fontWeight: '600' },
	taskTime: { color: '#cbd5e1', fontSize: 10 },
	fab: { position: 'absolute', right: 20, bottom: 32, width: 60, height: 60, borderRadius: 30, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
	fabText: { color: '#fff', fontSize: 30, lineHeight: 34 },
	pickerPortal: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, justifyContent: 'flex-end', backgroundColor: '#00000066' },
	iosPickerCard: { backgroundColor: '#18202a', paddingTop: 12, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
	iosPickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 4 },
	iosPickerTitle: { color: 'white', fontSize: 14, fontWeight: '600' },
	datePickerShell: { backgroundColor: '#162028', padding: 12, borderRadius: 14, gap: 10 },
	datePickerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
	dateCenterWrap: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#1e293b' },
	dateCenterText: { color: 'white', fontSize: 14, fontWeight: '600' },
	timePickerShell: { backgroundColor: '#162028', padding: 12, borderRadius: 14, gap: 12 },
	timePickerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	dualTimeRow: { gap: 16, alignItems: 'flex-start' },
	singleTimeCol: { flex: 1, gap: 6 },
	spinRow: { alignItems: 'center', gap: 6 },
	spinTime: { color: 'white', minWidth: 70, textAlign: 'center', fontVariant: ['tabular-nums'] },
	minAdjustRow: { gap: 6, flexWrap: 'wrap' },
});
