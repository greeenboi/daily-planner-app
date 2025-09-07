import { expo } from "@better-auth/expo";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

const prisma = (() => {
	const url = process.env.TURSO_DATABASE_URL;
	if (url) {
		const adapter = new PrismaLibSQL({
			url,
			authToken: process.env.TURSO_AUTH_TOKEN,
		});
		if (process.env.NODE_ENV !== "production") {
			console.log("[db] Using Turso libSQL adapter");
		}
		return new PrismaClient({ adapter });
	}
	if (process.env.NODE_ENV !== "production") {
		console.log("[db] Using local SQLite dev.db (no TURSO_DATABASE_URL set)");
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
