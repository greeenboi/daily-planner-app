import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const authClient = createAuthClient({
	// Production deployment base
	// Deployed web auth host: https://daily-planner.expo.app
	// Order of resolution:
	// 1. EXPO_PUBLIC_AUTH_BASE_URL env (allows overriding via eas env)
	// 2. If dev (__DEV__), attempt to derive local metro host for hitting local API routes
	// 3. Fallback to production deployed host
	// baseURL: (() => {
	// 	const PROD = "https://daily-planner.expo.app/api/auth";
	// 	// Environment override (configure in app.config / eas.json env)
	// 	// Accept with or without trailing /api/auth
	// 	const envUrl = process.env.EXPO_PUBLIC_AUTH_BASE_URL;
	// 	if (envUrl) {
	// 		if (/\/api\/auth\/?$/.test(envUrl)) return envUrl.replace(/\/$/, "");
	// 		return `${envUrl.replace(/\/$/, "")}/api/auth`;
	// 	}
	// 	if (__DEV__) {
	// 		try {
	// 			const devUrl = Linking.createURL("/"); // e.g., exp://192.168.x.x:8081/
	// 			const match = devUrl.match(/\/\/([^/:]+):(\d+)/);
	// 			if (match) {
	// 				const host = match[1];
	// 				const port = match[2];
	// 				return `http://${host}:${port}/api/auth`;
	// 			}
	// 		} catch {}
	// 	}
	// 	return PROD;
	// })(),
	baseURL: process.env.BETTER_AUTH_URL,
	disableDefaultFetchPlugins: true,
	plugins: [
		expoClient({
			scheme: "exp",
			storagePrefix: "withbetterauth",
			storage: SecureStore,
		}),
	],
});
