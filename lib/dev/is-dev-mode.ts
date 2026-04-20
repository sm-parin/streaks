/**
 * Dev-mode flag.
 * Reads NEXT_PUBLIC_DEV_MODE at runtime so it works in both client and server code.
 * Always false in production builds.
 */
export const IS_DEV_MODE =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_DEV_MODE === "true";
