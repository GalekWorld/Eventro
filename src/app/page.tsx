import { redirect } from "next/navigation";
import { getCurrentUser, getDefaultAppPathForRole } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  redirect(getDefaultAppPathForRole(user.role));
}
