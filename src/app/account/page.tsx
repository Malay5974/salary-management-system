import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Account from "@/components/Account";
import { SESSION_COOKIE, verifySession } from "@/server/auth/session";
export default async function AccountPage() {
  const user = await verifySession(
    (await cookies()).get(SESSION_COOKIE)?.value,
  );
  if (!user) redirect("/");
  return <Account user={user} />;
}
