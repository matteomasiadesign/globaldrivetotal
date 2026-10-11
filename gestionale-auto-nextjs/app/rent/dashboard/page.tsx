import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RentApp from "@/components/rent/RentApp";

export default async function RentDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/rent/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("ruolo")
    .eq("id", user.id)
    .single();

  return <RentApp userEmail={user.email ?? ""} isAdmin={profile?.ruolo === "admin"} />;
}
