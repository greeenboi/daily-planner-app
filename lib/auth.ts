import { expo } from "@better-auth/expo";
import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
// IMPORTANT: Do NOT statically import '@prisma/adapter-libsql' here.
// We load it dynamically only in a real Node server environment so Metro
// (the React Native bundler) never tries to resolve native binaries.

const prisma = (() => {
	const isReactNative =
		typeof navigator !== "undefined" && navigator.product === "ReactNative";
	const isNode = typeof process !== "undefined" && !!process.release && process.release.name === "node";

	// Never attempt adapter client-side / RN runtime.
	if (!isNode || isReactNative) {
		return new PrismaClient();
	}

	const url = process.env.TURSO_DATABASE_URL;
	const authToken = process.env.TURSO_AUTH_TOKEN;
	if (url) {
		try {
			// Obfuscated dynamic require so Metro cannot statically follow it.
			// eslint-disable-next-line no-eval
			const req: NodeRequire = eval('require');
			const adapterModName = ['@prisma','adapter-libsql'].join('/');
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const { PrismaLibSQL } = req(adapterModName);
			const adapter = new PrismaLibSQL({ url, authToken });
			return new PrismaClient({ adapter });
		} catch (e) {
			if (process.env.NODE_ENV !== 'production') {
				// eslint-disable-next-line no-console
				console.warn('[auth] Failed to load libSQL adapter; falling back to local SQLite.', e);
			}
		}
	}
	return new PrismaClient();
})();

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "sqlite",
	}),
	emailAndPassword: {
		enabled: true,
	},
	plugins: [
		expo({
			overrideOrigin: true,
		}),
	],
	socialProviders: {},
	trustedOrigins: [
		"exp://",
		"withbetterauth://",
		"http://localhost:",
		"https://easein-daily-planner.vercel.app",
		"*turso.io"
	],
	logger: {
		disabled: false,
		level: "info",
		log: (level, message, ...args) => {
			console.log(`${level}: ${message}`);
			console.log(JSON.stringify(args, null, 2));
		},
	},
});
