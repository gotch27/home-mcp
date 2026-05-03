import { z } from "zod";

// Put shared schemas here when multiple processes or routes use them.
// The starter uses Zod, but NextSignal only needs the adapter contract.
// You can replace Zod later without changing process lifecycle semantics.
export const healthInputSchema = z.object({}).passthrough();

export type HealthInput = z.infer<typeof healthInputSchema>;
