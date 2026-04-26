"use client";

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/trpc/router";

/** tRPC React client — import this wherever you need trpc.x.y.useMutation() */
export const trpc = createTRPCReact<AppRouter>();
