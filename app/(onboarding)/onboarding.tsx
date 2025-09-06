import { useAudioPlayer } from "expo-audio";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React from "react";
import { Animated, Dimensions, Easing, PanResponder, View } from "react-native";

import BackgroundImage from "@/components/background-image";
import { Button, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Center } from "@/components/ui/center";
import { Heading } from "@/components/ui/heading";
import { Icon } from "@/components/ui/icon";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icon";
import { Image } from "@/components/ui/image";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Image as ExpoImage } from "expo-image";

export default function Onboarding() {
	const router = useRouter();

	const slides = React.useMemo(
		() => [
			{
				title: "Welcome to EaseIn",
				body: "Your focused daily planner. Let's show you a few quick things.",
				image: require("../../assets/illustrations/idea-girl.png"),
				width: 444,
				height: 444,
			},
			{
				title: "Plan Your Day",
				body: "Capture tasks, goals and routines in one clean timeline.",
				image: require("../../assets/illustrations/book-girl.png"),
				width: 375,
				height: 325,
			},
			{
				title: "Stay On Track",
				body: "Smart reminders help you focus on what matters right now.",
				image: require("../../assets/illustrations/laptop-girl.png"),
				width: 356,
				height: 340,
			},
			{
				title: "Reflect & Improve",
				body: "Review your day and build consistent habits over time.",
				image: require("../../assets/illustrations/rocket-girl.png"),
				width: 356,
				height: 340,
			},
		],
		[],
	);

	const [index, setIndex] = React.useState(0);
	const last = index === slides.length - 1;

	const position = React.useRef(new Animated.Value(0)).current;

	const voiceIntro1 = useAudioPlayer(
		require("../../assets/voicelines/arabella-onboarding.mp3"),
	);

	const introProgress = React.useRef(new Animated.Value(0)).current;
	const spinValue = React.useRef(new Animated.Value(0)).current;
	const pulseValue = React.useRef(new Animated.Value(0)).current;
	const [introDone, setIntroDone] = React.useState(false);
	const [isAudioActive, setIsAudioActive] = React.useState(false);

	React.useEffect(() => {
		if (!introDone) return;
		let poll: NodeJS.Timeout | null = null;
		let stopTimeout: NodeJS.Timeout | null = null;
		try {
			voiceIntro1?.seekTo?.(0);
			voiceIntro1?.play?.();
			setIsAudioActive(true);
		} catch {}
		function scheduleStop() {
			const durMs = (voiceIntro1?.duration ?? 3.5) * 1000;
			stopTimeout = setTimeout(() => setIsAudioActive(false), durMs + 150);
		}
		if (voiceIntro1?.duration) {
			scheduleStop();
		} else {
			poll = setInterval(() => {
				if (voiceIntro1?.duration) {
					if (poll) clearInterval(poll);
					scheduleStop();
				}
			}, 180);
			// Fallback in case duration never loads
			stopTimeout = setTimeout(() => {
				if (poll) clearInterval(poll);
				setIsAudioActive(false);
			}, 4000);
		}
		return () => {
			if (poll) clearInterval(poll);
			if (stopTimeout) clearTimeout(stopTimeout);
		};
	}, [introDone, voiceIntro1]);

	React.useEffect(() => {
		Animated.timing(introProgress, {
			toValue: 1,
			duration: 1100,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: true,
		}).start(({ finished }) => {
			if (finished) setIntroDone(true);
		});
	}, [introProgress]);

	React.useEffect(() => {
		if (!isAudioActive) return;
		spinValue.setValue(0);
		const spinLoop = Animated.loop(
			Animated.timing(spinValue, {
				toValue: 1,
				duration: 5000,
				easing: Easing.linear,
				useNativeDriver: true,
			}),
		);
		spinLoop.start();
		return () => spinLoop.stop();
	}, [isAudioActive, spinValue]);

	React.useEffect(() => {
		if (!isAudioActive) return;
		pulseValue.setValue(0);
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(pulseValue, {
					toValue: 1,
					duration: 900,
					easing: Easing.out(Easing.quad),
					useNativeDriver: true,
				}),
				Animated.timing(pulseValue, {
					toValue: 0,
					duration: 900,
					easing: Easing.inOut(Easing.quad),
					useNativeDriver: true,
				}),
			]),
		);
		loop.start();
		return () => loop.stop();
	}, [isAudioActive, pulseValue]);

	React.useEffect(() => {
		Animated.spring(position, {
			toValue: index,
			useNativeDriver: false,
			friction: 9,
			tension: 80,
		}).start();
	}, [index, position]);

	// Mark onboarding complete immediately on entering the page
	React.useEffect(() => {
		SecureStore.setItemAsync("onboarding_completed", "true").catch(() => {});
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const handleNext = React.useCallback(() => {
		if (last) {
			router.replace("/sign-up");
			return;
		}
		setIndex((i) => Math.min(i + 1, slides.length - 1));
	}, [last, slides.length]);

	const handlePrev = React.useCallback(() => {
		setIndex((i) => Math.max(i - 1, 0));
	}, []);

	const panResponder = React.useRef(
		PanResponder.create({
			onMoveShouldSetPanResponder: (_, g) =>
				Math.abs(g.dx) > 10 && Math.abs(g.dy) < 20,
			onPanResponderRelease: (_, g) => {
				if (g.dx < -40) {
					if (last) {
						router.replace("/sign-up");
					} else {
						handleNext();
					}
				} else if (g.dx > 40 && index > 0) {
					handlePrev();
				}
			},
		}),
	).current;

	const dotSize = 8;
	const activeSize = 18;
	const gap = 8;
	const outputRangeLeft = slides.map((_, i) => i * (dotSize + gap));
	const activeLeft = position.interpolate({
		inputRange: slides.map((_, i) => i),
		outputRange: outputRangeLeft,
	});

	const stretchWidth = position.interpolate({
		inputRange: slides.flatMap((_, i) => [i - 0.499, i, i + 0.499]),
		outputRange: slides.flatMap(() => [dotSize, activeSize, dotSize]),
		extrapolate: "clamp",
	});

	return (() => {
		const screenW = Dimensions.get("window").width;
		const startTop = 90;
		const endMargin = 18;
		const startSize = 140;
		const endSize = 48;
		const translateX = introProgress.interpolate({
			inputRange: [0, 1],
			outputRange: [0, screenW / 2 - endMargin - endSize / 2],
		});
		const translateY = introProgress.interpolate({
			inputRange: [0, 1],
			outputRange: [0, -(startTop - endMargin)],
		});
		const scale = introProgress.interpolate({
			inputRange: [0, 1],
			outputRange: [1, endSize / startSize],
		});
		const spin = spinValue.interpolate({
			inputRange: [0, 1],
			outputRange: ["0deg", "360deg"],
		});
		const pulseScale = pulseValue.interpolate({
			inputRange: [0, 1],
			outputRange: [1, 1.3],
		});

		if (!introDone) {
			return (
				<View style={{ flex: 1, backgroundColor: "#1E1E1E" }}>
					<BackgroundImage />
					<View style={{ flex: 1 }} pointerEvents="none">
						<Animated.View
							style={{
								position: "absolute",
								top: startTop,
								left: 0,
								right: 0,
								alignItems: "center",
								transform: [
									{ translateX },
									{ translateY },
									{ scale },
									{ scale: isAudioActive ? pulseScale : 1 },
									{ rotate: isAudioActive ? spin : "0deg" },
								],
							}}
						>
							<ExpoImage
								source={require("../../assets/splash-icon.svg")}
								style={{ width: startSize, height: startSize }}
								contentFit="contain"
							/>
						</Animated.View>
					</View>
				</View>
			);
		}

		return (
			<View style={{ flex: 1, backgroundColor: "#1E1E1E" }}>
				<BackgroundImage />
				<Animated.View
					pointerEvents="none"
					style={{
						position: "absolute",
						top: endMargin,
						right: endMargin,
						transform: [
							{ scale: isAudioActive ? pulseScale : 1 },
							{ rotate: isAudioActive ? spin : "0deg" },
						],
					}}
				>
					<ExpoImage
						source={require("../../assets/splash-icon.svg")}
						style={{ width: endSize, height: endSize }}
						contentFit="contain"
					/>
				</Animated.View>
				<Center
					pointerEvents="none"
					className="absolute left-0 right-0 top-0 bottom-0"
				>
					<View
						style={{
							width: "100%",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						{slides.map((s, i) => {
							const opacity = position.interpolate({
								inputRange: [i - 0.75, i, i + 0.75],
								outputRange: [0, 1, 0],
								extrapolate: "clamp",
							});
							const translateX = position.interpolate({
								inputRange: [i - 1, i, i + 1],
								outputRange: [70, 0, -70],
								extrapolate: "clamp",
							});
							const translateY = position.interpolate({
								inputRange: [i - 1, i, i + 1],
								outputRange: [20, 0, -20],
								extrapolate: "clamp",
							});
							const scale = position.interpolate({
								inputRange: [i - 1, i, i + 1],
								outputRange: [0.9, 1, 0.9],
								extrapolate: "clamp",
							});
							return (
								<Animated.View
									key={`${s.title}-img`}
									style={{
										position: "absolute",
										opacity,
										transform: [{ translateX }, { translateY }, { scale }],
									}}
								>
									<Image
										style={{
											width: s.width,
											height: s.height,
											transform: [{ scale: 0.95 }],
										}}
										className={`w-[${s.width}px] h-[${s.height}px]`}
										source={s.image}
										alt={`${s.title} illustration`}
										resizeMode="contain"
									/>
								</Animated.View>
							);
						})}
					</View>
				</Center>
				<View
					style={{
						position: "absolute",
						left: 0,
						right: 0,
						bottom: 0,
						paddingHorizontal: 16,
						paddingBottom: 30,
					}}
				>
					<Card
						size="md"
						variant="ghost"
						className="gap-4 border-0 bg-transparent w-full max-w-[640px] self-center"
						{...panResponder.panHandlers}
					>
						<VStack space="md">
							<View style={{ height: 90, position: "relative" }}>
								{slides.map((s, i) => {
									const translateX = position.interpolate({
										inputRange: [i - 1, i, i + 1],
										outputRange: [40, 0, -40],
										extrapolate: "clamp",
									});
									const opacity = position.interpolate({
										inputRange: [i - 0.7, i, i + 0.7],
										outputRange: [0, 1, 0],
										extrapolate: "clamp",
									});
									return (
										<Animated.View
											key={s.title}
											style={{
												position: "absolute",
												left: 0,
												right: 0,
												opacity,
												transform: [{ translateX }],
											}}
										>
											<VStack space="xs">
												<Heading size="lg">{s.title}</Heading>
												<Text size="sm" className="text-typography-500">
													{s.body}
												</Text>
											</VStack>
										</Animated.View>
									);
								})}
							</View>
							{last ? (
								<Button
									onPress={() => router.replace("/sign-up")}
									variant="solid"
									action="primary"
									accessibilityLabel="Finish onboarding"
									className="self-center mt-5 px-8 "
								>
									<ButtonText>Get Started</ButtonText>
								</Button>
							) : (
								<View
									style={{
										flexDirection: "row",
										alignItems: "center",
										justifyContent: "space-between",
										marginTop: 4,
									}}
								>
									<View style={{ flexDirection: "row", alignItems: "center" }}>
										<Button
											onPress={handlePrev}
											variant="solid"
											action="primary"
											isDisabled={index === 0}
											className="h-12 w-12 rounded-full ml-3 p-0 items-center justify-center bg-white"
										>
											<Icon
												as={ChevronLeftIcon}
												className={`w-5 h-5 text-black ${index === 0 ? "opacity-40" : "opacity-100"}`}
											/>
										</Button>
									</View>
									<View
										style={{
											position: "relative",
											flexDirection: "row",
											alignItems: "center",
											justifyContent: "center",
											paddingHorizontal: 4,
										}}
									>
										{slides.map((s, i) => (
											<View
												key={s.title}
												style={{
													width: dotSize,
													height: dotSize,
													borderRadius: 999,
													backgroundColor: "#ffffff",
													opacity: 0.25,
													marginHorizontal: gap / 2,
												}}
											/>
										))}
										<Animated.View
											style={{
												position: "absolute",
												left: 4 + gap / 2,
												height: dotSize,
												borderRadius: 999,
												backgroundColor: "#ffffff",
												transform: [
													{
														translateX: Animated.add(
															activeLeft,
															new Animated.Value(0),
														),
													},
												],
												width: stretchWidth,
											}}
										/>
									</View>
									<View style={{ flexDirection: "row", alignItems: "center" }}>
										{!last && (
											<Button
												onPress={handleNext}
												variant="solid"
												action="primary"
												accessibilityLabel="Next slide"
												className="h-12 w-12 rounded-full mr-3 p-0 items-center justify-center bg-white"
											>
												<Icon
													as={ChevronRightIcon}
													className="w-5 h-5 text-black"
												/>
											</Button>
										)}
									</View>
								</View>
							)}
						</VStack>
					</Card>
				</View>
			</View>
		);
	})();
}
