import { useEffect, useMemo, useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Text, Pressable, Platform } from 'react-native';
import { authClient } from '@/lib/auth-client';
import { DateTimePicker } from '@expo/ui/jetpack-compose';
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

	// Fetch tasks for selected date
	const fetchTasks = useCallback(async () => {
		if (!session?.user) return;
		setLoading(true);
		try {
			const iso = selectedDate.toISOString().slice(0,10);
			const res = await fetch(`/api/tasks?date=${iso}`);
			const json = await res.json();
			if (res.ok) setTasks(json.tasks || []);
		} finally {
			setLoading(false);
		}
	}, [session?.user, selectedDate]);

	useEffect(() => { fetchTasks(); }, [fetchTasks]);

	const grouped = useMemo(() => {
		const map: Record<number, PlannerTask[]> = {};
		for (const t of tasks) {
			const hour = new Date(t.start).getHours();
			if (!map[hour]) map[hour] = [];
			map[hour].push(t);
		}
		return map;
	}, [tasks]);

	const createTask = async () => {
		if (!newTitle.trim()) return;
		const body = {
			title: newTitle.trim(),
			start: startTime.toISOString(),
			end: endTime.toISOString(),
		};
		const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
		if (res.ok) {
			setNewTitle('');
			setCreateOpen(false);
			fetchTasks();
		}
	};

	const dateLabel = selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

	return (
		<View style={styles.root}>
			<HStack style={styles.header}>
				<Heading size="xl">Daily Plan</Heading>
				<View style={{ flex: 1 }} />
				<Button onPress={() => authClient.signOut()}><ButtonText>Sign out</ButtonText></Button>
			</HStack>
			<VStack style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
				<GSText size="sm" style={{ opacity: 0.8 }}>Welcome {session?.user?.name}</GSText>
				<GSText>{dateLabel}</GSText>
			</VStack>
			<View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
				{/* Date picker (day) */}
				<DateTimePicker
					onDateSelected={(d) => {
						setSelectedDate(new Date(d));
					}}
					displayedComponents='date'
					initialDate={selectedDate.toISOString()}
					variant='picker'
				/>
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
				setStartTime(new Date());
				setEndTime(new Date(Date.now()+30*60000));
				setCreateOpen(true);
			}}>
				<Text style={styles.fabText}>＋</Text>
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
							<GSText size="sm" style={{ opacity: 0.7 }}>Start Time</GSText>
							{Platform.OS === 'android' ? (
								<DateTimePicker
									onDateSelected={(d) => setStartTime(new Date(d))}
									displayedComponents='hourAndMinute'
									initialDate={startTime.toISOString()}
									variant='picker'
								/>
							) : (
								<Text>{startTime.toLocaleTimeString()}</Text>
							)}
							<GSText size="sm" style={{ opacity: 0.7 }}>End Time</GSText>
							{Platform.OS === 'android' ? (
								<DateTimePicker
									onDateSelected={(d) => setEndTime(new Date(d))}
									displayedComponents='hourAndMinute'
									initialDate={endTime.toISOString()}
									variant='picker'
								/>
							) : (
								<Text>{endTime.toLocaleTimeString()}</Text>
							)}
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
		</View>
	);
}

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
});
