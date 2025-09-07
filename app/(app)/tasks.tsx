import {
	Actionsheet,
	ActionsheetBackdrop,
	ActionsheetContent,
	ActionsheetDragIndicator,
	ActionsheetDragIndicatorWrapper,
	ActionsheetItem,
	ActionsheetItemText,
} from "@/components/ui/actionsheet";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import {
	AddIcon,
	CheckIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	Icon,
	TrashIcon,
} from "@/components/ui/icon";
import { Input, InputField } from "@/components/ui/input";
import {
	Popover,
	PopoverBackdrop,
	PopoverBody,
	PopoverContent,
} from "@/components/ui/popover";
import { Pressable } from "@/components/ui/pressable";
import {
	Slider,
	SliderFilledTrack,
	SliderThumb,
	SliderTrack,
} from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import { VStack } from "@/components/ui/vstack";
import { authClient } from "@/lib/auth-client";
import type { PlannerTask } from "@/lib/types/task-planner";
import DateTimePicker, {
	type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView } from "react-native";
import { Platform, View } from "react-native";

export default function TasksListPage() {
	const { data: session } = authClient.useSession();
	const { date: paramDate, taskId: paramTaskId } = useLocalSearchParams<{
		date?: string;
		taskId?: string;
	}>();
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [tasks, setTasks] = useState<PlannerTask[]>([]);
	const [loading, setLoading] = useState(false);
	const [newTitle, setNewTitle] = useState("");
	const [showCreate, setShowCreate] = useState(false);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState(1); // 1-4 slider
	const [allDay, setAllDay] = useState(false);
	const [popoverOpen, setPopoverOpen] = useState(false);
	const fetchIdRef = useRef(0);
	const [highlightId, setHighlightId] = useState<string | null>(null);
	const [showActionsheet, setShowActionsheet] = useState(false);
	const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
	const [editTitle, setEditTitle] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [editAllDay, setEditAllDay] = useState(false);
	const [editPriority, setEditPriority] = useState(2);
	const [editStatus, setEditStatus] = useState<
		"PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELED"
	>("PENDING");

	const dateLabel = selectedDate.toLocaleDateString(undefined, {
		weekday: "long",
		month: "short",
		day: "numeric",
	});

	function groupByDay(tasks: PlannerTask[]) {
		return tasks.reduce<Record<string, PlannerTask[]>>((acc, t) => {
			const d = new Date(t.start).toISOString().slice(0, 10);
			if (!acc[d]) acc[d] = [];
			acc[d].push(t);
			return acc;
		}, {});
	}

	const fetchTasks = useCallback(async () => {
		if (!session?.user) return;
		const fetchId = ++fetchIdRef.current;
		setLoading(true);
		const iso = selectedDate.toISOString().slice(0, 10);
		try {
			const authHeader: Record<string, string> = {};
			if (session?.session?.token)
				authHeader.Authorization = `Bearer ${session.session.token}`;
			const res = await fetch(`/api/tasks?date=${iso}`, {
				headers: authHeader,
				credentials: "include",
			});
			let json: { tasks?: PlannerTask[] } = {};
			try {
				json = await res.json();
			} catch {}
			if (fetchIdRef.current !== fetchId) return;
			if (res.ok && Array.isArray(json.tasks)) setTasks(json.tasks);
		} finally {
			setLoading(false);
		}
	}, [session?.user, session?.session?.token, selectedDate]);

	useEffect(() => {
		fetchTasks();
	}, [fetchTasks]);

	// When arriving with a date param, sync selectedDate
	useEffect(() => {
		if (paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate)) {
			const parts = paramDate.split("-");
			const d = new Date(
				Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])),
			);
			if (!Number.isNaN(d.getTime())) setSelectedDate(d);
		}
	}, [paramDate]);

	const createTask = async () => {
		if (!newTitle.trim()) return;
		// default times: now to +30m (or all-day if toggled)
		const start = new Date(selectedDate);
		if (!allDay) {
			const now = new Date();
			start.setHours(now.getHours(), now.getMinutes(), 0, 0);
		} else {
			start.setHours(0, 0, 0, 0);
		}
		const end = new Date(
			start.getTime() + (allDay ? 24 * 60 * 60000 : 30 * 60000),
		);
		const body = {
			title: newTitle.trim(),
			start: start.toISOString(),
			end: end.toISOString(),
			description,
			allDay,
			priority: ["LOW", "NORMAL", "HIGH", "CRITICAL"][priority - 1],
		};
		const authHeader: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (session?.session?.token)
			authHeader.Authorization = `Bearer ${session.session.token}`;
		const res = await fetch("/api/tasks", {
			method: "POST",
			headers: authHeader,
			credentials: "include",
			body: JSON.stringify(body),
		});
		try {
			await res.json();
		} catch {}
		setNewTitle("");
		setDescription("");
		setShowCreate(false);
		fetchTasks();
	};

	function onDatePickerChange(e: DateTimePickerEvent, d?: Date) {
		if (e.type === "dismissed") {
			setShowDatePicker(false);
			return;
		}
		if (d) setSelectedDate(d);
		if (Platform.OS !== "ios") setShowDatePicker(false);
	}

	const groupedTasksByDay = groupByDay(tasks);

	const currentDayKey = selectedDate.toISOString().slice(0, 10);
	const currentDayTasks = groupedTasksByDay[currentDayKey] || [];
	currentDayTasks.sort(
		(a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
	);
	const scrollRef = useRef<ScrollView | null>(null);

	// Bottom sheet removed; tap reserved for future detail page.
	function openTaskSheet(taskId: string) {
		const t = tasks.find((x) => x.id === taskId);
		if (!t) return;
		setActiveTaskId(taskId);
		setEditTitle(t.title);
		// Extend type safely with optional fields we expect may exist from API include
		// description & status are not in PlannerTask; treat as possibly present from enriched fetch
		const enriched = t as PlannerTask & {
			description?: string;
			status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";
		};
		setEditDescription(enriched.description || "");
		setEditAllDay(!!enriched.allDay);
		const allowedPriorities = ["LOW", "NORMAL", "HIGH", "CRITICAL"] as const;
		const rawPriority = (enriched.priority || "NORMAL").toUpperCase();
		function isAllowedPriority(
			v: string,
		): v is (typeof allowedPriorities)[number] {
			return (allowedPriorities as readonly string[]).includes(v);
		}
		const priorityValue = isAllowedPriority(rawPriority)
			? rawPriority
			: "NORMAL";
		const pIdx = allowedPriorities.indexOf(priorityValue);
		setEditPriority(pIdx >= 0 ? pIdx + 1 : 2);
		setEditStatus(enriched.status || "PENDING");
		setShowActionsheet(true);
	}

	async function authHeader(): Promise<Record<string, string>> {
		const h: Record<string, string> = { "Content-Type": "application/json" };
		if (session?.session?.token)
			h.Authorization = `Bearer ${session.session.token}`;
		return h;
	}

	// updateTask removed with bottom sheet elimination
	async function updateTask(patch: Record<string, unknown>) {
		if (!activeTaskId) return;
		await fetch("/api/tasks", {
			method: "PATCH",
			headers: await authHeader(),
			body: JSON.stringify({ id: activeTaskId, ...patch }),
		});
		fetchTasks();
	}

	async function deleteTask(id: string) {
		await fetch(`/api/tasks?id=${id}`, {
			method: "DELETE",
			headers: await authHeader(),
		});
		fetchTasks();
	}

	async function toggleComplete(id: string) {
		const t = tasks.find((x) => x.id === id);
		if (!t) return;
		// naive toggle between COMPLETED and PENDING
		await fetch("/api/tasks", {
			method: "PATCH",
			headers: await authHeader(),
			body: JSON.stringify({ id, status: "COMPLETED" }),
		});
		fetchTasks();
	}

	// After tasks load, if taskId param is provided, attempt to scroll to it
	useEffect(() => {
		if (!paramTaskId) return;
		// Wait a tick for layout
		setTimeout(() => {
			const idx = currentDayTasks.findIndex((t) => t.id === paramTaskId);
			if (idx >= 0 && scrollRef.current) {
				const approximateRowHeight = 68; // card height guess
				scrollRef.current.scrollTo({
					y: idx * approximateRowHeight,
					animated: true,
				});
			}
		}, 50);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only recompute when taskId or tasks set changes materially
	}, [paramTaskId, currentDayTasks]);

	// Transient highlight for 500ms when navigated with taskId
	useEffect(() => {
		if (!paramTaskId) return;
		setHighlightId(paramTaskId as string);
		const to = setTimeout(() => setHighlightId(null), 500);
		return () => clearTimeout(to);
	}, [paramTaskId]);

	return (
		<View className="flex-1 bg-[#0c0f14]">
			<HStack className="pt-[52px] px-4 items-center">
				<Heading size="xl">Tasks {loading ? "…" : ""}</Heading>
				<View className="flex-1" />
				<Button onPress={() => authClient.signOut()}>
					<ButtonText>Sign out</ButtonText>
				</Button>
			</HStack>
			<VStack className="px-4 pb-3">
				<Text className="text-white/70 text-xs mb-1">Select Day</Text>
				<HStack className="items-center justify-between w-full">
					<Button
						size="xs"
						variant="outline"
						action="secondary"
						onPress={() =>
							setSelectedDate((d) => new Date(d.getTime() - 86400000))
						}
					>
						<Icon as={ChevronLeftIcon} width={16} height={16} />
					</Button>
					<Pressable
						onPress={() => setShowDatePicker(true)}
						className="py-[6px] px-3 rounded-full bg-[#1e293b]"
					>
						<Text className="text-white text-sm font-semibold">
							{dateLabel}
						</Text>
					</Pressable>
					<Button
						size="xs"
						variant="outline"
						action="secondary"
						onPress={() =>
							setSelectedDate((d) => new Date(d.getTime() + 86400000))
						}
					>
						<Icon as={ChevronRightIcon} width={16} height={16} />
					</Button>
				</HStack>
			</VStack>

			<ScrollView ref={scrollRef} contentContainerClassName="pb-32 px-4 gap-4">
				{currentDayTasks.length === 0 && !loading && (
					<View className="bg-[#162028] p-4 rounded-xl">
						<Text className="text-white/70 text-sm">
							No tasks yet for this day.
						</Text>
					</View>
				)}
				{currentDayTasks.map((t) => {
					const start = new Date(t.start);
					const end = new Date(t.end);
					const timeStr = `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
					const isFocused = highlightId === t.id;
					return (
						<View
							key={t.id}
							className={`p-3 rounded-[14px] flex-row items-start gap-3 ${isFocused ? "bg-[#1e3a8a]" : "bg-[#162028]"}`}
							style={
								isFocused
									? {
											shadowColor: "#2563eb",
											shadowOpacity: 0.6,
											shadowRadius: 6,
										}
									: undefined
							}
						>
							<Pressable
								className="w-6 h-6 rounded-md border border-[#2563eb] items-center justify-center mr-1"
								onPress={() => toggleComplete(t.id)}
							>
								<Icon
									as={CheckIcon}
									width={14}
									height={14}
									className="opacity-60"
								/>
							</Pressable>
							<Pressable
								className="flex-1 gap-1"
								onPress={() => openTaskSheet(t.id)}
							>
								<Text className="text-white text-[15px] font-semibold">
									{t.title}
								</Text>
								<Text className="text-[#cbd5e1] text-[11px]">{timeStr}</Text>
							</Pressable>
							<Pressable onPress={() => deleteTask(t.id)} className="px-2 py-1">
								<Icon as={TrashIcon} width={16} height={16} />
							</Pressable>
						</View>
					);
				})}
			</ScrollView>

			{/* Floating create button */}
			<Pressable
				onPress={() => setShowCreate(true)}
				className="absolute right-5 bottom-8 w-[60px] h-[60px] rounded-full bg-[#2563eb] items-center justify-center shadow-lg"
			>
				<Icon as={AddIcon} width={28} height={28} />
			</Pressable>

			{showCreate && (
				<View className="absolute inset-0 bg-black/60 justify-end">
					<View className="bg-[#162028] rounded-t-2xl p-5 gap-4">
						<Heading size="md">New Task</Heading>
						<Input variant="outline" size="md">
							<InputField
								placeholder="Title"
								value={newTitle}
								onChangeText={setNewTitle}
							/>
						</Input>
						<Textarea size="md">
							<TextareaInput
								placeholder="Description"
								value={description}
								onChangeText={setDescription}
							/>
						</Textarea>
						<HStack className="items-center justify-between">
							<Text className="text-white/80 text-xs">All Day</Text>
							<Switch value={allDay} onValueChange={setAllDay} />
						</HStack>
						<View>
							<HStack className="items-center justify-between mb-1">
								<Text className="text-white/80 text-xs">Priority</Text>
								<Pressable
									onPress={() => setPopoverOpen((o) => !o)}
									className="px-2 py-1 bg-[#1e293b] rounded-md"
								>
									<Text className="text-white text-[11px]">Info</Text>
								</Pressable>
							</HStack>
							<Slider
								value={priority}
								minValue={1}
								maxValue={4}
								step={1}
								onChange={(v) =>
									setPriority(Array.isArray(v) ? v[0] : (v as number))
								}
							>
								<SliderTrack>
									<SliderFilledTrack />
								</SliderTrack>
								<SliderThumb />
							</Slider>
							<Text className="text-[#cbd5e1] text-[11px] mt-1">
								{["Low", "Normal", "High", "Critical"][priority - 1]}
							</Text>
						</View>
						<HStack className="justify-end gap-3 mt-2">
							<Button
								variant="outline"
								action="secondary"
								onPress={() => setShowCreate(false)}
							>
								<ButtonText>Cancel</ButtonText>
							</Button>
							<Button onPress={createTask} isDisabled={!newTitle.trim()}>
								<ButtonText>Create</ButtonText>
							</Button>
						</HStack>
					</View>
				</View>
			)}

			{showDatePicker && (
				<View className="absolute inset-0 justify-end bg-black/60">
					<View className="bg-[#18202a] pt-3 rounded-t-[20px]">
						<View className="flex-row justify-between items-center px-4 mb-1">
							<Text className="text-white text-sm font-semibold">
								Select Date
							</Text>
							<Button
								size="xs"
								variant="outline"
								action="secondary"
								onPress={() => setShowDatePicker(false)}
							>
								<ButtonText>Done</ButtonText>
							</Button>
						</View>
						<DateTimePicker
							value={selectedDate}
							mode="date"
							is24Hour
							display="spinner"
							onChange={onDatePickerChange}
						/>
					</View>
				</View>
			)}

			<Popover
				isOpen={popoverOpen}
				onClose={() => setPopoverOpen(false)}
				placement="top"
				trigger={(_props, _state) => <View />}
			>
				<PopoverBackdrop />
				<PopoverContent className="w-60">
					<PopoverBody>
						<Text className="text-white text-xs">
							Priority helps highlight important tasks. Critical tasks may
							deserve earlier attention.
						</Text>
					</PopoverBody>
				</PopoverContent>
			</Popover>

			{/* Actionsheet for task details */}
			<Actionsheet
				isOpen={showActionsheet}
				onClose={() => {
					setShowActionsheet(false);
					setActiveTaskId(null);
				}}
			>
				<ActionsheetBackdrop />
				<ActionsheetContent className="bg-[#0f1720]">
					<ActionsheetDragIndicatorWrapper>
						<ActionsheetDragIndicator />
					</ActionsheetDragIndicatorWrapper>
					{activeTaskId ? (
						<View className="gap-5 pt-2 pb-8 px-1">
							<View className="gap-2">
								<Text className="text-white text-xs opacity-70">Title</Text>
								<Input variant="outline" size="md">
									<InputField
										value={editTitle}
										onChangeText={setEditTitle}
										placeholder="Task title"
									/>
								</Input>
							</View>
							<View className="gap-2">
								<Text className="text-white text-xs opacity-70">
									Description
								</Text>
								<Textarea size="md">
									<TextareaInput
										value={editDescription}
										onChangeText={setEditDescription}
										placeholder="Notes / details"
									/>
								</Textarea>
							</View>
							<HStack className="items-center justify-between">
								<Text className="text-white text-xs opacity-70">All Day</Text>
								<Switch
									value={editAllDay}
									onValueChange={(v) => setEditAllDay(v)}
								/>
							</HStack>
							<View className="gap-2">
								<HStack className="items-center justify-between">
									<Text className="text-white text-xs opacity-70">
										Priority
									</Text>
									<Text className="text-white text-[11px]">
										{["Low", "Normal", "High", "Critical"][editPriority - 1]}
									</Text>
								</HStack>
								<Slider
									value={editPriority}
									minValue={1}
									maxValue={4}
									step={1}
									onChange={(v) => {
										const nv = Array.isArray(v) ? v[0] : (v as number);
										setEditPriority(nv);
									}}
								>
									<SliderTrack>
										<SliderFilledTrack />
									</SliderTrack>
									<SliderThumb />
								</Slider>
							</View>
							<View className="gap-2">
								<Text className="text-white text-xs opacity-70">Status</Text>
								<HStack className="gap-2 flex-wrap">
									{(
										["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELED"] as const
									).map((s) => (
										<Pressable
											key={s}
											onPress={() => setEditStatus(s)}
											className={`px-3 py-1 rounded-full ${editStatus === s ? "bg-[#2563eb]" : "bg-[#1e293b]"}`}
										>
											<Text className="text-white text-[11px]">
												{s.replace("_", " ")}
											</Text>
										</Pressable>
									))}
								</HStack>
							</View>
							<HStack className="justify-end gap-3 pt-2">
								<Button
									variant="outline"
									action="secondary"
									onPress={() => {
										setShowActionsheet(false);
										setActiveTaskId(null);
									}}
								>
									<ButtonText>Close</ButtonText>
								</Button>
								<Button
									onPress={() => {
										updateTask({
											title: editTitle,
											description: editDescription,
											allDay: editAllDay,
											priority: ["LOW", "NORMAL", "HIGH", "CRITICAL"][
												editPriority - 1
											],
											status: editStatus,
										});
										setShowActionsheet(false);
									}}
								>
									<ButtonText>Save</ButtonText>
								</Button>
							</HStack>
							<ActionsheetItem
								onPress={() => {
									if (activeTaskId) {
										deleteTask(activeTaskId);
										setShowActionsheet(false);
									}
								}}
							>
								<ActionsheetItemText className="text-red-400">
									Delete Task
								</ActionsheetItemText>
							</ActionsheetItem>
						</View>
					) : (
						<View className="py-8 px-4">
							<Text className="text-white/70 text-sm">No task selected.</Text>
						</View>
					)}
				</ActionsheetContent>
			</Actionsheet>
		</View>
	);
}
