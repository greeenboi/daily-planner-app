export type SessionState = {
	data?: unknown | null;
	status?: "idle" | "loading" | "pending" | "success" | "error" | string;
	isLoading?: boolean;
	isPending?: boolean;
};
