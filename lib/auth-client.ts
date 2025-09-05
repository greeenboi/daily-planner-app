import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const authClient = createAuthClient({
	// Derive the dev server host:port from the Expo URL and point to the API route
	// so requests don't go to the Metro bundler root or the wrong localhost.
	baseURL: (() => {
		try {
			const devUrl = Linking.createURL("/"); // e.g., exp://192.168.x.x:8081/
			const match = devUrl.match(/\/\/([^/:]+):(\d+)/);
			if (match) {
				const host = match[1];
				const port = match[2];
				return `http://${host}:${port}/api/auth`;
			}
		} catch {}
		// Fallbacks for emulators/simulators
		if (Platform.OS === "android") return "http://10.0.2.2:8081/api/auth";
		return "http://127.0.0.1:8081/api/auth";
	})(),
	disableDefaultFetchPlugins: true,
	plugins: [
		expoClient({
			scheme: "exp",
			storagePrefix: "withbetterauth",
			storage: SecureStore,
		}),
	],
});
