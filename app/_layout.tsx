import { Image } from "expo-image";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";

import { authClient } from "@/lib/auth-client";

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import "@/global.css";
import type { SessionState } from "@/lib/types/session-state";

// Keep the native/web splash screen visible until auth state is resolved
void SplashScreen.preventAutoHideAsync();

SplashScreen.setOptions({
	duration: 1000,
	fade: true,
});

export default function RootLayout() {
	const sessionState = authClient.useSession() as SessionState;
	const session = sessionState?.data;
	const isAuthenticated = !!session;
	const [onboardingCompleted, setOnboardingCompleted] = useState<
		boolean | null
	>(null);
	const isLoading = useMemo(
		() =>
			Boolean(
				sessionState?.isPending ||
					sessionState?.isLoading ||
					sessionState?.status === "pending" ||
					sessionState?.status === "loading",
			),
		[sessionState?.isPending, sessionState?.isLoading, sessionState?.status],
	);

	// Load onboarding status (only needed when not authenticated)
	useEffect(() => {
		let mounted = true;
		async function loadOnboarding() {
			try {
				if (isAuthenticated) {
					// Not needed for authenticated users
					if (mounted) setOnboardingCompleted(null);
					return;
				}
				const val = await SecureStore.getItemAsync("onboarding_completed");
				if (!mounted) return;
				setOnboardingCompleted(val === "true");
			} catch {
				if (mounted) setOnboardingCompleted(false);
			}
		}

		loadOnboarding();
		return () => {
			mounted = false;
		};
	}, [isAuthenticated]);

	useEffect(() => {
		// Hide the native splash as soon as our JS is ready; we'll show a manual splash while loading.
		SplashScreen.hideAsync().catch(() => {});
	}, []);

	useEffect(() => {
		if (!isLoading) {
			SplashScreen.hideAsync().catch(() => {});
		}
	}, [isLoading]);

	// Wait for auth and onboarding check to avoid flicker when unauthenticated
	if (isLoading || (!isAuthenticated && onboardingCompleted === null))
		return (
			<View className="flex-1 bg-[#1E1E1E]">
				<Image
					source={require("../assets/Splash.svg")}
					style={{ width: "100%", height: "100%" }}
					contentFit="cover"
				/>
			</View>
		);

	return (
		<GluestackUIProvider mode="dark">
			<GestureHandlerRootView >
				<Stack screenOptions={{ headerShown: false }}>
					<Stack.Protected guard={isAuthenticated}>
						<Stack.Screen name="(app)" />
					</Stack.Protected>
					<Stack.Protected
						guard={!isAuthenticated && onboardingCompleted === true}
					>
						<Stack.Screen name="(auth)" />
					</Stack.Protected>
					{/* Unauthenticated: always allow auth routes; show onboarding group only if not completed */}
					<Stack.Screen name="(onboarding)" />
				</Stack>
			</GestureHandlerRootView>
		</GluestackUIProvider>
	);
}
