import { getSessionUser } from "@/lib/auth-session";
import { getCurrentUserInspectionPermissions } from "@/lib/inspection-access";
import { canAccessSetting } from "@/lib/settings-access";
import { AppShellClient } from "./AppShellClient";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const canReadSettings = user ? await canAccessSetting("read.settings") : false;
  const canAccessP2h = user
    ? (await getCurrentUserInspectionPermissions()).size > 0
    : false;
  return (
    <AppShellClient user={user} canReadSettings={canReadSettings} canAccessP2h={canAccessP2h}>
      {children}
    </AppShellClient>
  );
}
