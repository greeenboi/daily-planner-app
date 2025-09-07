import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as NavigationBar from "expo-navigation-bar";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

function TabBarIcon({
	name,
	color,
}: { name: React.ComponentProps<typeof FontAwesome>["name"]; color: string }) {
	return (
		<FontAwesome
			size={22}
			style={{ marginBottom: -2 }}
			name={name}
			color={color}
		/>
	);
}

export default function AppLayout() {
	useEffect(() => {
		const setNavBar = async () => {
			await NavigationBar.setBehaviorAsync("overlay-swipe");
		};
		setNavBar();
	}, []);
	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarActiveTintColor: "#7265E2",
				tabBarInactiveTintColor: "#7A7A85",
				tabBarShowLabel: true,
				tabBarLabelStyle: {
					fontSize: 11,
					fontWeight: "500",
					marginBottom: Platform.OS === "ios" ? 0 : 4,
				},
				tabBarStyle: {
					backgroundColor: "#0c0f14",
					height: Platform.OS === "ios" ? 70 : 60,
					paddingBottom: Platform.OS === "ios" ? 12 : 8,
				},
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
					tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
				}}
			/>
			<Tabs.Screen
				name="tasks"
				options={{
					title: "Tasks",
					tabBarIcon: ({ color }) => (
						<TabBarIcon name="check-square" color={color} />
					),
				}}
			/>
		</Tabs>
	);
}
