import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "VENUE") {
    redirect("/local/dashboard");
  }

  if (user.role === "VENUE_PENDING") {
    redirect("/venue/pending");
  }

  redirect("/dashboard");
}
