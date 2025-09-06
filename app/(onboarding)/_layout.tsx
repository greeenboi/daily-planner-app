import { Stack } from "expo-router";

export default function OnboardingLayout() {
	return (
		<Stack>
			<Stack.Screen name="onboarding" options={{ headerShown: false }} />
		</Stack>
	);
}
