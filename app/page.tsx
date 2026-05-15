import { redirect } from "next/navigation";

/**
 * Root route — immediately redirects to Goals tab.
 * The middleware will intercept unauthenticated requests and send them to /login.
 */
export default function Home() {
  redirect("/goals");
}
