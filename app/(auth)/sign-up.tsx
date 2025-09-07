import { authClient } from "@/lib/auth-client";
import { Link } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React from "react";
import {
	Animated,
	Easing,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	View,
} from "react-native";

import BackgroundImage from "@/components/background-image";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Center } from "@/components/ui/center";
import {
	FormControl,
	FormControlError,
	FormControlErrorIcon,
	FormControlErrorText,
	FormControlHelper,
	FormControlHelperText,
	FormControlLabel,
	FormControlLabelText,
} from "@/components/ui/form-control";
import { Heading } from "@/components/ui/heading";
import { AlertCircleIcon } from "@/components/ui/icon";
import { Image } from "@/components/ui/image";
import { Input, InputField } from "@/components/ui/input";
import { LinkText } from "@/components/ui/link";
import { Text } from "@/components/ui/text";
import {
	Toast,
	ToastDescription,
	ToastTitle,
	useToast,
} from "@/components/ui/toast";
import { VStack } from "@/components/ui/vstack";

export default function SignUp() {
	const toast = useToast();
	const router = useRouter();
	const { fromOnboarding } = useLocalSearchParams<{
		fromOnboarding?: string;
	}>();
	const [email, setEmail] = React.useState("");
	const [name, setName] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [submitting, setSubmitting] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		if (fromOnboarding === "1") {
			SecureStore.setItemAsync("onboarding_completed", "true").catch(() => {});
		}
	}, [fromOnboarding]);

	// Enter animation: fade in + slide up
	const translateY = React.useRef(new Animated.Value(40)).current;
	const opacity = React.useRef(new Animated.Value(0)).current;
	React.useEffect(() => {
		Animated.parallel([
			Animated.timing(translateY, {
				toValue: 0,
				duration: 450,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: true,
			}),
			Animated.timing(opacity, {
				toValue: 1,
				duration: 300,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: true,
			}),
		]).start();
	}, [opacity, translateY]);

	const isEmailValid = /.+@.+\..+/.test(email);
	const isPasswordValid = password.length >= 6;
	const isNameValid = name.trim().length >= 2;

	const handleSignUp = async () => {
		setError(null);
		console.info("[auth] signUp invoked", { email, name });
		if (!isEmailValid || !isPasswordValid || !isNameValid) {
			console.info("[auth] signUp validation_failed", {
				email,
				nameLength: name.length,
				isEmailValid,
				isPasswordValid,
				isNameValid,
			});
			setError("Please fill all fields correctly.");
			return;
		}
		setSubmitting(true);
		const started = Date.now();
		try {
			console.info("[auth] signUp request_start", { email });
			const res = await authClient.signUp.email({ email, password, name });
			const duration = Date.now() - started;
			if (res.error) {
				console.info("[auth] signUp error", {
					email,
					name,
					durationMs: duration,
					message: res.error.message,
				});
				setError(res.error.message || "signup handler error");
				return;
			}
			console.info("[auth] signUp success", {
				email,
				name,
				durationMs: duration,
				user: typeof res === "object" && res && "data" in res && (res as { data?: { user?: { id?: string } } }).data?.user?.id,
			});
			const id = Math.random().toString();
			toast.show({
				id,
				placement: "top",
				duration: 2500,
				render: ({ id }) => (
					<Toast nativeID={`toast-${id}`} action="muted" variant="solid">
						<ToastTitle>Account created</ToastTitle>
						<ToastDescription>Welcome, {name}!</ToastDescription>
					</Toast>
				),
			});
		} catch (e: unknown) {
			const duration = Date.now() - started;
			const message = e instanceof Error ? e.message : String(e);
			console.info("[auth] signUp exception", { email, name, durationMs: duration, message });
			throw e;
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<View style={{ flex: 1, backgroundColor: "#1E1E1E" }}>
			<BackgroundImage />
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.select({ ios: "padding", android: "height" })}
				enabled
				keyboardVerticalOffset={0}
			>
				<ScrollView
					style={{ flex: 1 }}
					contentContainerStyle={{ flexGrow: 1 }}
					keyboardShouldPersistTaps="handled"
					automaticallyAdjustKeyboardInsets
				>
					<Animated.View
						style={{
							opacity,
							transform: [{ translateY }],
							flex: 1,
							justifyContent: "flex-end",
						}}
					>
						<VStack className="px-4 pb-12" space="md" reversed={false}>
							<Center className="w-full">
								<Image
									// Use inline styles to avoid CSSInterop dynamic variable remount warnings
									style={{
										width: 356,
										height: 345,
										transform: [{ scale: 0.95 }],
									}}
									className=" w-[356px] h-[345px]"
									source={require("../../assets/illustrations/rocket-girl.png")}
									alt="image"
									resizeMode="contain"
								/>
							</Center>
							<Card size="md" variant="elevated" className="p-4 gap-3 border-0">
								<Heading size="md">Create your account</Heading>
								<Text size="sm" className="text-typography-500">
									Sign up to start planning your day.
								</Text>

								<FormControl isInvalid={!isNameValid && name.length > 0}>
									<FormControlLabel>
										<FormControlLabelText>Name</FormControlLabelText>
									</FormControlLabel>
									<Input>
										<InputField
											placeholder="Jane Doe"
											value={name}
											onChangeText={setName}
											autoCapitalize="words"
										/>
									</Input>
									<FormControlHelper>
										<FormControlHelperText>
											At least 2 characters.
										</FormControlHelperText>
									</FormControlHelper>
									<FormControlError>
										<FormControlErrorIcon as={AlertCircleIcon} />
										<FormControlErrorText>
											Please enter your name.
										</FormControlErrorText>
									</FormControlError>
								</FormControl>

								<FormControl isInvalid={!isEmailValid && email.length > 0}>
									<FormControlLabel>
										<FormControlLabelText>Email</FormControlLabelText>
									</FormControlLabel>
									<Input>
										<InputField
											value={email}
											onChangeText={setEmail}
											inputMode="email"
											autoCapitalize="none"
										/>
									</Input>
									<FormControlHelper>
										<FormControlHelperText>
											Use a valid email address.
										</FormControlHelperText>
									</FormControlHelper>
									<FormControlError>
										<FormControlErrorIcon as={AlertCircleIcon} />
										<FormControlErrorText>
											Enter a valid email.
										</FormControlErrorText>
									</FormControlError>
								</FormControl>

								<FormControl
									isInvalid={!isPasswordValid && password.length > 0}
								>
									<FormControlLabel>
										<FormControlLabelText>Password</FormControlLabelText>
									</FormControlLabel>
									<Input>
										<InputField
											placeholder="••••••"
											value={password}
											onChangeText={setPassword}
											secureTextEntry
										/>
									</Input>
									<FormControlHelper>
										<FormControlHelperText>
											Must be at least 6 characters.
										</FormControlHelperText>
									</FormControlHelper>
									<FormControlError>
										<FormControlErrorIcon as={AlertCircleIcon} />
										<FormControlErrorText>
											Password too short.
										</FormControlErrorText>
									</FormControlError>
								</FormControl>

								{error ? <Text className="text-error-600">{error}</Text> : null}

								<Button
									action="primary"
									variant="solid"
									onPress={handleSignUp}
									isDisabled={submitting}
								>
									{submitting ? (
										<ButtonSpinner />
									) : (
										<ButtonText>Sign up</ButtonText>
									)}
								</Button>
								<Text size="sm">
									Already have an account?{" "}
									<Link href="/(auth)/sign-in">
										<LinkText>Sign in</LinkText>
									</Link>
								</Text>
								{/* Dev utility: reset onboarding flag */}
								<View style={{ alignItems: "center", marginTop: 8 }}>
									<Text
										onPress={async () => {
											await SecureStore.setItemAsync(
												"onboarding_completed",
												"false",
											);
											toast.show({
												id: Math.random().toString(),
												placement: "bottom",
												duration: 1500,
												render: ({ id }) => (
													<Toast
														nativeID={`toast-${id}`}
														action="muted"
														variant="solid"
													>
														<ToastTitle>Onboarding reset</ToastTitle>
														<ToastDescription>
															Flag set to false
														</ToastDescription>
													</Toast>
												),
											});
											router.replace("/onboarding");
										}}
										className="text-typography-500"
									>
										Dev: Reset onboarding
									</Text>
								</View>
							</Card>
						</VStack>
					</Animated.View>
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}
