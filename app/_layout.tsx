import { Image } from "expo-image";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo } from "react";
import { View } from "react-native";

import { authClient } from "@/lib/auth-client";

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
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

	useEffect(() => {
		// Hide the native splash as soon as our JS is ready; we'll show a manual splash while loading.
		SplashScreen.hideAsync().catch(() => {});
	}, []);

	useEffect(() => {
		if (!isLoading) {
			SplashScreen.hideAsync().catch(() => {});
		}
	}, [isLoading]);

	if (isLoading)
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
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Protected guard={isAuthenticated}>
					<Stack.Screen name="(app)" />
				</Stack.Protected>
				<Stack.Protected guard={!isAuthenticated}>
					<Stack.Screen name="(auth)" />
				</Stack.Protected>
			</Stack>
		</GluestackUIProvider>
	);
}
