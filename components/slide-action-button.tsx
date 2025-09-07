import { ChevronsRightIcon, Icon } from "@/components/ui/icon";
import { LinearGradient } from "@/components/ui/linear-gradient";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useReducer,
	useRef,
	useState,
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
	Confirmed = 3,
}

interface Props {
	containerStyle?: ViewStyle;
	renderSlider?: (status: Status) => React.ReactElement; // if provided overrides default knob
	threshold?: number; // 0..1
	onSwipeStart?: () => void;
	onConfirm?: () => void; // synchronous, navigation or side effects
	children?: ReactNode; // optional custom center content (overrides label)
	label?: string; // convenience centered label
	onStatusChange?: (status: Status) => void;
	height?: number; // track height
	knobSize?: number; // knob diameter
	trackBackgroundColor?: string;
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
		disabled = false,
	} = props;

	const [state, dispatch] = useReducer(reducer, initialState as State);
	const [containerW, setContainerW] = useState(0);
	const [knobWState, setKnobWState] = useState(knobSize);
	const stateRef = useRef(state);
	const setStatus = (s: Status) =>
		dispatch({ type: "UpdateStatus", payload: s });

	const containerWidthRef = useRef(0);
	const knobWidthRef = useRef(knobSize);
	const onSwipeStartRef = useRef(onSwipeStart);
	const onConfirmRef = useRef(onConfirm);
	const moveX = useRef(new Animated.Value(0)).current; // 0..(containerWidth - knobWidth)
	const shimmerAnim = useRef(new Animated.Value(0)).current;

	// Derived progress 0..1
	const progress = useRef(new Animated.Value(0)).current;
	useEffect(() => {
		const id = moveX.addListener(({ value }) => {
			const max = Math.max(1, containerWidthRef.current - knobWidthRef.current);
			progress.setValue(value / max);
		});
		return () => moveX.removeListener(id);
	}, [moveX, progress]);

	// Shimmer loop (iOS style) when idle / initial
	useEffect(() => {
		if (state.status !== Status.Initial) return; // only shimmer when waiting
		shimmerAnim.setValue(0);
		let mounted = true;
		Animated.loop(
			Animated.timing(shimmerAnim, {
				toValue: 1,
				duration: 1800,
				easing: Easing.inOut(Easing.linear),
				useNativeDriver: true,
			}),
		).start();
		return () => {
			mounted = false;
		};
	}, [state.status, shimmerAnim]);

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
			onStartShouldSetPanResponderCapture: () => !disabled,
			onMoveShouldSetPanResponder: () => !disabled,
			onMoveShouldSetPanResponderCapture: () => !disabled,
			onPanResponderTerminationRequest: () => false,
			onPanResponderGrant: () => {
				if (disabled || stateRef.current.status === Status.Confirmed) return;
				onSwipeStartRef.current?.();
				moveX.stopAnimation();
				setStatus(Status.Initial);
			},
			onPanResponderMove: (
				_evt: GestureResponderEvent,
				gestureState: PanResponderGestureState,
			) => {
				if (disabled || stateRef.current.status === Status.Confirmed) return;
				setStatus(Status.Moving);
				const max = containerWidthRef.current - knobWidthRef.current;
				const dx = Math.min(Math.max(0, gestureState.dx), Math.max(0, max));
				moveX.setValue(dx);
			},
			onPanResponderRelease: (
				_evt: GestureResponderEvent,
				gestureState: PanResponderGestureState,
			) => {
				if (disabled || stateRef.current.status === Status.Confirmed) return;
				const max = containerWidthRef.current - knobWidthRef.current;
				const dx = Math.min(Math.max(0, gestureState.dx), Math.max(0, max));
				const ratio = max > 0 ? dx / max : 0;
				if (ratio >= threshold) {
					setStatus(Status.Confirmed);
					animateTo(max, () => {
						onConfirmRef.current?.();
					});
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
		if (state.status === Status.Confirmed) {
			animateTo(Math.max(0, max));
		} else if (state.status === Status.Initial) {
			animateTo(0);
		}
	}, [state.status, animateTo]);

	const interpolatedLabelOpacity = progress.interpolate({
		inputRange: [0, 0.75, 1],
		outputRange: [0.55, 0.85, 1],
		extrapolate: "clamp",
	});

	const shimmerTranslate = shimmerAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [-60, containerW + 60],
	});

	// Width of active gradient fill behind knob
	const activeFillWidth = progress.interpolate({
		inputRange: [0, 1],
		outputRange: [knobWState, Math.max(knobWState, containerW)],
	});

	return (
		<View
			style={[styles.container, { height }, containerStyle]}
			onLayout={(e: LayoutChangeEvent) => {
				containerWidthRef.current = e.nativeEvent.layout.width;
				setContainerW(e.nativeEvent.layout.width);
			}}
		>
			{/* Track base */}
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
				{/* Active fill gradient */}
				<Animated.View
					style={{
						position: "absolute",
						left: 0,
						top: 0,
						bottom: 0,
						width: activeFillWidth,
						borderRadius: height / 2,
						overflow: "hidden",
					}}
				>
					<LinearGradient
						colors={["rgba(134,55,207,0.55)", "rgba(15,85,161,0.55)"]}
						start={[0, 0.5]}
						end={[1, 0.5]}
						className="w-full h-full opacity-60"
					/>
				</Animated.View>

				{/* Label / content */}
				<View style={styles.centerContent}>
					{children ? (
						children
					) : (
						<Animated.View style={{ opacity: interpolatedLabelOpacity }}>
							<Text style={styles.labelText} numberOfLines={1}>
								{label ?? "Slide to Continue"}
							</Text>
							{/* Shimmer overlay */}
							{state.status === Status.Initial && (
								<Animated.View
									pointerEvents="none"
									style={{
										position: "absolute",
										left: 0,
										top: 0,
										bottom: 0,
										transform: [{ translateX: shimmerTranslate }],
										width: 90,
									}}
								>
									<LinearGradient
										colors={[
											"rgba(255,255,255,0)",
											"rgba(255,255,255,0.55)",
											"rgba(255,255,255,0)",
										]}
										start={[0, 0.5]}
										end={[1, 0.5]}
										className="h-full w-full"
									/>
								</Animated.View>
							)}
						</Animated.View>
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
					shadowColor: "transparent",
					top: (height - knobSize) / 2,
					transform: [{ translateX: moveX }],
				}}
				{...panResponder.panHandlers}
				hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
				onLayout={(e: LayoutChangeEvent) => {
					knobWidthRef.current = e.nativeEvent.layout.width;
					setKnobWState(e.nativeEvent.layout.width);
				}}
			>
				{renderSlider ? (
					renderSlider(state.status)
				) : (
					<View
						style={{
							width: knobSize,
							height: knobSize,
							borderRadius: knobSize / 2,
							alignItems: "center",
							justifyContent: "center",
							backgroundColor: "transparent",
						}}
					>
						<Icon as={ChevronsRightIcon} size="xl" className="text-white" />
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
		borderColor: "rgba(255,255,255,0.2)",
		overflow: "hidden",
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
});
