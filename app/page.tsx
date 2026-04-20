import { redirect } from "next/navigation";

/**
 * Root route ΓÇô immediately redirects to Today's Tasks.
 * The middleware will intercept unauthenticated requests and send them to /login.
 */
export default function Home() {
  redirect("/today");
}
