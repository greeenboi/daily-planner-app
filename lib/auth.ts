import { expo } from "@better-auth/expo";
import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

const prisma = new PrismaClient();

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "sqlite",
	}),
	emailAndPassword: {
		enabled: true,
	},
	plugins: [expo()],
	socialProviders: {},
	trustedOrigins: [
		"exp://",
		"withbetterauth://",
		"http://localhost:",
		"http://127.0.0.1:",
		"http://10.0.2.2:",
		"http://192.168.", // local LAN dev ranges
	],
	logger: {
		log: (level, message, ...args) => {
			console.log(`${level}: ${message}`);
			console.log(JSON.stringify(args, null, 2));
		},
	},
});
