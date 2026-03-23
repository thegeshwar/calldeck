import { Sidebar } from "@/components/sidebar";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profiles } = await supabase
    .from("cd_profiles")
    .select("*")
    .order("display_name");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userId={user.id}
        profiles={(profiles as Profile[]) || []}
      />
      <main className="flex-1 flex flex-col overflow-hidden bg-bg-surface">
        {children}
      </main>
    </div>
  );
}
