import { redirect } from "next/navigation";

/** URL lama `/users` diarahkan ke pengaturan. */
export default function LegacyUsersPage() {
  redirect("/settings/users");
}
