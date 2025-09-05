import { authClient } from "@/lib/auth-client";
import { Link } from "expo-router";
import React from "react";
import { Animated, Easing, View } from "react-native";

import BackgroundImage from "@/components/background-image";
import { AlertIcon, AlertText, Alert as GSAlert } from "@/components/ui/alert";
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
import { AlertCircleIcon, InfoIcon } from "@/components/ui/icon";
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

export default function SignIn() {
	const toast = useToast();
	const [email, setEmail] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [submitting, setSubmitting] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

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

	const handleLogin = async () => {
		setError(null);
		if (!isEmailValid || !isPasswordValid) {
			setError("Enter a valid email and password (min 6 chars).");
			return;
		}
		setSubmitting(true);
		try {
			const res = await authClient.signIn.email({ email, password });
			if (res.error) {
				setError(res.error.message || "signin handler error");
				return;
			}
			const id = Math.random().toString();
			toast.show({
				id,
				placement: "top",
				duration: 2500,
				render: ({ id }) => (
					<Toast nativeID={`toast-${id}`} action="muted" variant="solid">
						<ToastTitle>Signed in</ToastTitle>
						<ToastDescription>Welcome back!</ToastDescription>
					</Toast>
				),
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<View style={{ flex: 1, backgroundColor: "#1E1E1E" }}>
			<BackgroundImage />
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
							style={{ width: 375, height: 363, transform: [{ scale: 0.95 }] }}
							className=" w-[375px] h-[363px]"
							source={require("../../assets/illustrations/rocket-girl.png")}
							alt="image"
							resizeMode="contain"
						/>
					</Center>
					<Card size="md" variant="elevated" className="p-4 gap-3 border-0">
						<Heading size="md">Welcome back</Heading>
						<Text size="sm" className="text-typography-500">
							Sign in to continue planning.
						</Text>

						<FormControl isInvalid={!isEmailValid && email.length > 0}>
							<FormControlLabel>
								<FormControlLabelText>Email</FormControlLabelText>
							</FormControlLabel>
							<Input>
								<InputField
									placeholder="you@example.com"
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

						<FormControl isInvalid={!isPasswordValid && password.length > 0}>
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
								<FormControlErrorText>Password too short.</FormControlErrorText>
							</FormControlError>
						</FormControl>

						{error ? (
							<GSAlert action="muted" variant="outline">
								<AlertIcon as={InfoIcon} />
								<AlertText>{error}</AlertText>
							</GSAlert>
						) : null}

						<Button
							action="primary"
							variant="solid"
							onPress={handleLogin}
							isDisabled={submitting}
						>
							{submitting ? (
								<ButtonSpinner />
							) : (
								<ButtonText>Sign in</ButtonText>
							)}
						</Button>
						<Text size="sm">
							No account yet?{" "}
							<Link href="/(auth)/sign-up">
								<LinkText>Create one</LinkText>
							</Link>
						</Text>
					</Card>
				</VStack>
			</Animated.View>
		</View>
	);
}
