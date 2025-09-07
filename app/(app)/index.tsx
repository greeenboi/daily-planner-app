import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { View, ScrollView, Text, Pressable, Platform } from 'react-native';
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
import { CalendarDaysIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, ChevronDownIcon, AddIcon, Icon } from '@/components/ui/icon';
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
const HOUR_HEIGHT = 80; // px per hour for vertical timeline

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
	const scrollRef = useRef<ScrollView | null>(null);
	const autoScrolledRef = useRef(false);
	// Capture last outbound request for on-screen debugging. Body is unknown; we stringify defensively.
	interface LastRequestMeta { url: string; method: string; headers: Record<string,string>; body?: unknown; ts: string }
	const [lastRequest, setLastRequest] = useState<null | LastRequestMeta>(null);

	function stringifyBody(b: unknown): string {
		try {
			if (typeof b === 'string') return b;
			return JSON.stringify(b, null, 2);
		} catch {
			return '[unserializable body]';
		}
	}
	const [showDebug, setShowDebug] = useState(false);

	// unified picker state
	const [pickerVisible, setPickerVisible] = useState(false);
	const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
	const [pickerTarget, setPickerTarget] = useState<'date' | 'start' | 'end'>('date');
	const [consecutivePick, setConsecutivePick] = useState(false);

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
			// Prefer immediate token from in-memory session object to avoid async race
			if (session?.session?.token) {
				authHeader.Authorization = `Bearer ${session.session.token}`;
			}
			// Fallback async secure store (may overwrite with same value) – non-blocking if fails
			try {
				const SecureStore = await import('expo-secure-store');
				const stored = await SecureStore.getItemAsync?.('withbetterauth:access_token');
				if (stored && !authHeader.Authorization) authHeader.Authorization = `Bearer ${stored}`;
			} catch {}
			const requestUrl = `/api/tasks?date=${iso}`;
			log('REQ → GET', requestUrl, authHeader);
			setLastRequest({ url: requestUrl, method: 'GET', headers: { ...authHeader }, ts: new Date().toISOString() });
			const res = await fetch(requestUrl , { credentials: 'include', headers: authHeader });
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
	}, [session?.user, session?.session?.token, selectedDate, log]);

	useEffect(() => { fetchTasks(); }, [fetchTasks]);

	// Reset auto-scroll flag when date changes
	// Reset auto scroll before fetching when selectedDate changes (invoked just before fetchTasks effect)
	const prevDateRef = useRef<string>(selectedDate.toISOString().slice(0,10));
	useEffect(() => {
		const curr = selectedDate.toISOString().slice(0,10);
		if (prevDateRef.current !== curr) {
			autoScrolledRef.current = false;
			prevDateRef.current = curr;
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- we intentionally only track day changes via derived string
	}, [selectedDate]);

	// Auto-scroll to first task when tasks load
	useEffect(() => {
		if (autoScrolledRef.current) return;
		if (!tasks.length) return;
		const first = tasks.slice().sort((a,b)=> new Date(a.start).getTime() - new Date(b.start).getTime())[0];
		if (!first) return;
		const start = new Date(first.start);
		const minutesFromMidnight = start.getHours() * 60 + start.getMinutes();
		const y = (minutesFromMidnight / 60) * HOUR_HEIGHT - 40; // slight top padding
		requestAnimationFrame(() => {
			scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: true });
			autoScrolledRef.current = true;
		});
	}, [tasks]);

// Absolute layout eliminates hour grouping; tasks span vertically across hours.

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
			// Synchronous token from session first
			if (session?.session?.token) {
				authHeader.Authorization = `Bearer ${session.session.token}`;
			}
			// Async fallback
			if (!authHeader.Authorization) {
				try {
					const SecureStore = await import('expo-secure-store');
					const token = await SecureStore.getItemAsync?.('withbetterauth:access_token');
					if (token) authHeader.Authorization = `Bearer ${token}`;
				} catch (e) {
					log('SecureStore token read failed', e);
				}
			}
			if (!authHeader.Authorization) {
				log('WARNING: No Authorization header for createTask');
			}
			const postUrl = '/api/tasks';
			log('REQ → POST', postUrl, authHeader, body);
			setLastRequest({ url: postUrl, method: 'POST', headers: { ...authHeader }, body, ts: new Date().toISOString() });
			const res = await fetch(postUrl, { method: 'POST', credentials: 'include', headers: authHeader, body: JSON.stringify(body) });
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

	function openPicker(target: 'date' | 'start' | 'end', mode: 'date' | 'time', opts?: { consecutive?: boolean }) {
		if (opts?.consecutive) setConsecutivePick(true);
		setPickerTarget(target);
		setPickerMode(mode);
		setPickerVisible(true);
		log('Open picker', target, mode, 'consecutive', !!opts?.consecutive);
	}

	function handleHourPress(hour: number, offsetY: number) {
		// offsetY is vertical position inside the hour row (0..HOUR_HEIGHT)
		const minute = Math.min(59, Math.max(0, Math.round((offsetY / HOUR_HEIGHT) * 60)));
		const base = new Date(selectedDate);
		base.setHours(hour, minute, 0, 0);
		const end = new Date(base.getTime() + 30 * 60000);
		setStartTime(base);
		setEndTime(end);
		setNewTitle('');
		setCreateOpen(true);
		log('Hour press', { hour, minute, startISO: base.toISOString(), endISO: end.toISOString() });
	}

	function onPickerChange(event: DateTimePickerEvent, date?: Date) {
		log('Picker change event', event.type, pickerTarget, pickerMode, date?.toISOString());
		if (event.type === 'dismissed') {
			setPickerVisible(false);
			setConsecutivePick(false);
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
		// Consecutive flow: after picking start, move to end without closing; after end, close.
		if (event.type === 'set' && consecutivePick) {
			if (pickerTarget === 'start') {
				setPickerTarget('end');
				setPickerMode('time');
				return; // keep picker open
			}
			if (pickerTarget === 'end') {
				setConsecutivePick(false);
				setPickerVisible(false);
				return;
			}
		}
		if (Platform.OS !== 'ios' && !consecutivePick) {
			setPickerVisible(false);
		}
	}

	return (
		<View className="flex-1 bg-[#0c0f14]">
			<HStack className="pt-[52px] px-4 items-center">
				<Heading size="xl">Daily Plan {loading ? '…' : ''}</Heading>
				<View className="flex-1" />
				<Button onPress={() => authClient.signOut()}><ButtonText>Sign out</ButtonText></Button>
			</HStack>
			<VStack className="px-4 pb-2">
				<GSText size="sm" style={{ opacity: 0.8 }}>Welcome {session?.user?.name}</GSText>
				<GSText>{dateLabel}</GSText>
			</VStack>
			<View className="px-4 pb-2">
					<View className="bg-[#162028] p-3 rounded-[14px] gap-[10px]">
						<View className="flex-row items-center gap-[6px] mb-1">
								<Icon as={CalendarDaysIcon} width={16} height={16} />
						<GSText size="sm" style={{ opacity: 0.7 }}>Select Day</GSText>
					</View>
					<HStack className="items-center justify-between w-full">
							<Button size='xs' variant='outline' action='secondary' onPress={() => { setSelectedDate(d => { const nd = new Date(d.getTime() - 86400000); log('Date prev', nd); return nd; }); }}>
								<Icon as={ChevronLeftIcon} width={16} height={16} />
						</Button>
						<Pressable onPress={() => openPicker('date','date')} className="py-[6px] px-3 rounded-full bg-[#1e293b]">
							<Text className="text-white text-sm font-semibold">{dateLabel}</Text>
						</Pressable>
							<Button size='xs' variant='outline' action='secondary' onPress={() => { setSelectedDate(d => { const nd = new Date(d.getTime() + 86400000); log('Date next', nd); return nd; }); }}>
								<Icon as={ChevronRightIcon} width={16} height={16} />
						</Button>
					</HStack>
				</View>
			</View>

			<ScrollView ref={scrollRef} contentContainerClassName="pb-[120px]">
				<View className="relative" style={{ height: 24 * HOUR_HEIGHT }}>
					{/* Hour grid */}
					{HOURS.map(h => (
						<View key={h} style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }} className="absolute left-0 right-0 flex-row border-b border-[#262b33]">
							<View className="w-[54px] items-end pr-2 pt-[6px]">
								<Text className="text-[#64748b] text-[11px]">{h.toString().padStart(2,'0')}:00</Text>
							</View>
							<Pressable
								className="flex-1"
								onPress={(e) => {
									const y = (e.nativeEvent as { locationY?: number }).locationY ?? 0;
									handleHourPress(h, y);
								}}
							/>
						</View>
					))}
					{/* Task blocks spanning hours */}
					<View pointerEvents="box-none" className="absolute left-[54px] right-2 top-0">
						{tasks.map(t => {
							const start = new Date(t.start);
							const end = new Date(t.end);
							const startMin = start.getHours() * 60 + start.getMinutes();
							const endMinRaw = end.getHours() * 60 + end.getMinutes();
							const endMin = Math.max(startMin + 15, endMinRaw); // enforce minimum 15m duration
							const top = (startMin / 60) * HOUR_HEIGHT;
							const height = ((endMin - startMin) / 60) * HOUR_HEIGHT;
							return (
								<Pressable key={t.id} className="absolute rounded-[10px] p-2 border-l-4 gap-1" style={{ top, height, backgroundColor: t.color || '#2563eb22', borderLeftColor: t.color || '#2563eb', minHeight: 30 }}>
									<Text numberOfLines={3} className="text-white text-[13px] font-semibold">{t.title}</Text>
									<Text className="text-[#cbd5e1] text-[10px]">
										{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
									</Text>
								</Pressable>
							);
						})}
					</View>
				</View>
			</ScrollView>

			<Pressable className="absolute right-5 bottom-8 w-[60px] h-[60px] rounded-full bg-[#2563eb] items-center justify-center shadow-lg" onPress={() => {
				const now = new Date();
				log('FAB pressed; open create modal with base times', now);
				setStartTime(now);
				setEndTime(new Date(now.getTime()+30*60000));
				setCreateOpen(true);
			}}>
				<Icon as={AddIcon} width={28} height={28} />
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
							<View className="bg-[#162028] p-3 rounded-[14px] gap-3">
								<View className="flex-row items-center gap-[6px]">
									<Icon as={ClockIcon} width={16} height={16} />
									<GSText size='sm' style={{ opacity: 0.7 }}>Start / End</GSText>
								</View>
								<HStack className="gap-4 items-start">
									<View className="flex-1 gap-[6px]">
										<GSText size='xs' style={{ opacity: 0.6 }}>Start</GSText>
										<HStack className="items-center gap-[6px]">
											<Button size='xs' variant='link' action='secondary' onPress={() => setStartTime(t => { const nd = new Date(t.getTime() - 60*60000); log('Start -1h', nd); return nd; })}><Icon as={ChevronUpIcon} width={14} height={14} /></Button>
											<Pressable onPress={() => openPicker('start','time', { consecutive: true })} className="min-w-[70px]">
												<Text className="text-white text-center">{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
											</Pressable>
											<Button size='xs' variant='link' action='secondary' onPress={() => setStartTime(t => { const nd = new Date(t.getTime() + 60*60000); log('Start +1h', nd); return nd; })}><Icon as={ChevronDownIcon} width={14} height={14} /></Button>
										</HStack>
										{/* Minute adjustment buttons removed as requested */}
									</View>
									<View className="flex-1 gap-[6px]">
										<GSText size='xs' style={{ opacity: 0.6 }}>End</GSText>
										<HStack className="items-center gap-[6px]">
											<Button size='xs' variant='link' action='secondary' onPress={() => setEndTime(t => { const nd = new Date(t.getTime() - 60*60000); log('End -1h', nd); return nd; })}><Icon as={ChevronUpIcon} width={14} height={14} /></Button>
											<Pressable onPress={() => openPicker('end','time')} className="min-w-[70px]">
												<Text className="text-white text-center">{endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
											</Pressable>
											<Button size='xs' variant='link' action='secondary' onPress={() => setEndTime(t => { const nd = new Date(t.getTime() + 60*60000); log('End +1h', nd); return nd; })}><Icon as={ChevronDownIcon} width={14} height={14} /></Button>
										</HStack>
										{/* Minute adjustment buttons removed as requested */}
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
				<View className="absolute inset-0 justify-end bg-[#00000066]">
					{Platform.OS === 'ios' && (
						<View className="bg-[#18202a] pt-3 rounded-t-[20px]">
							<View className="flex-row justify-between items-center px-4 mb-1">
								<Text className="text-white text-sm font-semibold">{pickerTarget === 'date' ? 'Select Date' : pickerTarget === 'start' ? 'Start Time' : 'End Time'}</Text>
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

// StyleSheet removed in favor of Tailwind (NativeWind) utility classes.
