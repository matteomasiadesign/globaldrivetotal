import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GestionaleApp from "@/components/GestionaleApp";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("ruolo, email")
    .eq("id", user.id)
    .single();

  return <GestionaleApp userEmail={user.email ?? ""} ruolo={profile?.ruolo ?? "venditore"} />;
}
