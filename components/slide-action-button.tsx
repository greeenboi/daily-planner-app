import {
	type ReactNode,
	useCallback,
	useEffect,
	useReducer,
	useRef,
} from "react";
import {
	Animated,
	Easing,
	type GestureResponderEvent,
	type LayoutChangeEvent,
	PanResponder,
	type PanResponderGestureState,
	StyleSheet,
	Text,
	View,
	type ViewStyle,
} from "react-native";

export enum Status {
	Initial = 1,
	Moving = 2,
	Verifying = 3,
	Confirmed = 4,
	Failed = 5,
}

interface Props {
	containerStyle?: ViewStyle;
	renderSlider?: (status: Status) => React.ReactElement; // if provided overrides default knob
	threshold?: number; // 0..1
	onSwipeStart?: () => void;
	onConfirm?: () => Promise<unknown> | undefined;
	children?: ReactNode; // optional custom center content (overrides label)
	label?: string; // convenience centered label
	onStatusChange?: (status: Status) => void;
	height?: number; // track height
	knobSize?: number; // knob diameter
	trackBackgroundColor?: string;
	knobColor?: string;
	accentColor?: string; // used when confirmed / verifying
	disabled?: boolean;
}

const initialState = {
	status: Status.Initial,
};

interface State {
	status: Status;
}
interface Action {
	type: "UpdateStatus";
	payload: Status;
}
const reducer = (state: State, action: Action): State => {
	switch (action.type) {
		case "UpdateStatus":
			return {
				...state,
				status: action.payload,
			};
		default:
			return state;
	}
};

export default (props: Props) => {
	const {
		containerStyle,
		onSwipeStart,
		onConfirm,
		renderSlider,
		children,
		label,
		threshold = 0.5,
		onStatusChange,
		height = 56,
		knobSize = 52,
		trackBackgroundColor = "rgba(255,255,255,0.08)",
		knobColor = "#FFFFFF",
		accentColor = "#ff7a1a",
		disabled = false,
	} = props;

	const [state, dispatch] = useReducer(reducer, initialState as State);
	const stateRef = useRef(state);
	const setStatus = (s: Status) =>
		dispatch({ type: "UpdateStatus", payload: s });

	const containerWidthRef = useRef(0);
	const knobWidthRef = useRef(knobSize);
	const onSwipeStartRef = useRef(onSwipeStart);
	const onConfirmRef = useRef(onConfirm);
	const moveX = useRef(new Animated.Value(0)).current; // 0..(containerWidth - knobWidth)

	// Derived progress 0..1
	const progress = useRef(new Animated.Value(0)).current;
	useEffect(() => {
		const id = moveX.addListener(({ value }) => {
			const max = Math.max(1, containerWidthRef.current - knobWidthRef.current);
			progress.setValue(value / max);
		});
		return () => moveX.removeListener(id);
	}, [moveX, progress]);

	useEffect(() => {
		if (state.status !== stateRef.current.status) {
			onStatusChange?.(state.status);
		}
		stateRef.current = state;
	}, [state, onStatusChange]);

	useEffect(() => {
		onSwipeStartRef.current = onSwipeStart;
	}, [onSwipeStart]);
	useEffect(() => {
		onConfirmRef.current = onConfirm;
	}, [onConfirm]);

	const animateTo = useCallback(
		(toValue: number, cb?: () => void) => {
			Animated.timing(moveX, {
				toValue,
				duration: 420,
				easing: Easing.out(Easing.exp),
				useNativeDriver: true,
			}).start(() => cb?.());
		},
		[moveX],
	);

	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => !disabled,
			onStartShouldSetPanResponderCapture: () => !disabled, // capture so parent swipe pager doesn't steal it
			onMoveShouldSetPanResponder: () => !disabled,
			onMoveShouldSetPanResponderCapture: () => !disabled,
			onPanResponderTerminationRequest: () => false,
			onPanResponderGrant: () => {
				if (
					disabled ||
					[Status.Confirmed, Status.Verifying].includes(stateRef.current.status)
				)
					return;
				onSwipeStartRef.current?.();
				moveX.stopAnimation();
				setStatus(Status.Initial);
			},
			onPanResponderMove: (
				_evt: GestureResponderEvent,
				gestureState: PanResponderGestureState,
			) => {
				if (
					disabled ||
					[Status.Confirmed, Status.Verifying].includes(stateRef.current.status)
				)
					return;
				setStatus(Status.Moving);
				const max = containerWidthRef.current - knobWidthRef.current;
				const dx = Math.min(Math.max(0, gestureState.dx), Math.max(0, max));
				moveX.setValue(dx);
			},
			onPanResponderRelease: (
				_evt: GestureResponderEvent,
				gestureState: PanResponderGestureState,
			) => {
				if (
					disabled ||
					[Status.Confirmed, Status.Verifying].includes(stateRef.current.status)
				)
					return;
				const max = containerWidthRef.current - knobWidthRef.current;
				const dx = Math.min(Math.max(0, gestureState.dx), Math.max(0, max));
				const ratio = max > 0 ? dx / max : 0;
				if (ratio >= threshold) {
					if (onConfirmRef.current) {
						const maybe = onConfirmRef.current();
						if (maybe && typeof maybe.then === "function") {
							setStatus(Status.Verifying);
							animateTo(max);
							maybe
								.then(() => setStatus(Status.Confirmed))
								.catch(() => setStatus(Status.Failed));
						} else {
							setStatus(Status.Confirmed);
							animateTo(max);
						}
					} else {
						setStatus(Status.Confirmed);
						animateTo(max);
					}
				} else {
					setStatus(Status.Initial);
					animateTo(0);
				}
			},
		}),
	).current;

	// Animate knob to ends when status programmatically changes
	useEffect(() => {
		if (state.status === Status.Moving) return; // manual drag
		const max = containerWidthRef.current - knobWidthRef.current;
		if ([Status.Confirmed, Status.Verifying].includes(state.status)) {
			animateTo(Math.max(0, max));
		} else if (
			state.status === Status.Initial ||
			state.status === Status.Failed
		) {
			animateTo(0);
		}
	}, [state.status, animateTo]);

	const interpolatedLabelOpacity = progress.interpolate({
		inputRange: [0, 0.75, 1],
		outputRange: [0.55, 0.85, 1],
		extrapolate: "clamp",
	});

	return (
		<View
			style={[styles.container, { height }, containerStyle]}
			onLayout={(e: LayoutChangeEvent) => {
				containerWidthRef.current = e.nativeEvent.layout.width;
			}}
		>
			{/* Track */}
			<View
				pointerEvents="none"
				style={[
					styles.track,
					{
						backgroundColor: trackBackgroundColor,
						borderRadius: height / 2,
						height,
					},
				]}
			>
				{/* Inset top highlight & bottom shadow */}
				<View style={styles.insetTop} />
				<View style={styles.insetBottom} />
				<View style={styles.centerContent}>
					{children ? (
						children
					) : (
						<Animated.Text
							style={[styles.labelText, { opacity: interpolatedLabelOpacity }]}
							numberOfLines={1}
						>
							{label ?? "Slide to Continue"}
						</Animated.Text>
					)}
				</View>
			</View>

			{/* Knob */}
			<Animated.View
				accessibilityRole="button"
				accessibilityLabel={label ?? "Slide handle"}
				style={{
					position: "absolute",
					left: 0,
					top: (height - knobSize) / 2,
					transform: [{ translateX: moveX }],
				}}
				{...panResponder.panHandlers}
				hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
				onLayout={(e: LayoutChangeEvent) => {
					knobWidthRef.current = e.nativeEvent.layout.width;
				}}
			>
				{renderSlider ? (
					renderSlider(state.status)
				) : (
					<View
						style={[
							styles.knob,
							{
								width: knobSize,
								height: knobSize,
								borderRadius: knobSize / 2,
								backgroundColor:
									state.status === Status.Confirmed ? accentColor : knobColor,
							},
						]}
					>
						<View style={styles.chevronRow}>
							<Text
								style={[
									styles.chevron,
									{
										color: state.status === Status.Confirmed ? "#fff" : "#000",
										transform: [{ translateX: -2 }],
									},
								]}
							>
								›
							</Text>
							<Text
								style={[
									styles.chevron,
									{
										color: state.status === Status.Confirmed ? "#fff" : "#000",
									},
								]}
							>
								›
							</Text>
						</View>
					</View>
				)}
			</Animated.View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		width: "100%",
		position: "relative",
		justifyContent: "center",
	},
	track: {
		width: "100%",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.12)",
		overflow: "hidden",
	},
	insetTop: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: 2,
		backgroundColor: "rgba(255,255,255,0.18)",
	},
	insetBottom: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		height: 3,
		backgroundColor: "rgba(0,0,0,0.25)",
	},
	centerContent: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 28,
	},
	labelText: {
		color: "#FFFFFF",
		fontSize: 16,
		fontWeight: "600",
		letterSpacing: 0.4,
	},
	knob: {
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#000",
		shadowOpacity: 0.28,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
		elevation: 5,
	},
	chevronRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	chevron: {
		fontSize: 28,
		fontWeight: "700",
		lineHeight: 30,
	},
});
