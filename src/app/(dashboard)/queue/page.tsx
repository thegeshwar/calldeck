import { getQueueLeads } from "@/lib/queries/leads";
import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/lib/types";
import { todayLocal } from "@/lib/queue-logic";
import { Topbar } from "@/components/topbar";
import { StatBadge } from "@/components/ui/stat-badge";
import { QueueClient } from "./queue-client";

export default async function QueuePage() {
  const supabase = await createClient();
  const leads = await getQueueLeads();

  const { data: profiles } = await supabase
    .from("cd_profiles")
    .select("*");

  const today = todayLocal();
  const overdue = leads.filter((l) => l.next_followup && l.next_followup < today).length;
  const dueToday = leads.filter((l) => l.next_followup === today).length;
  const hot = leads.filter((l) => l.temperature === "hot").length;
  const fresh = leads.filter((l) => l.status === "new").length;

  return (
    <>
      <Topbar title="Today's Queue" subtitle={`${leads.length} leads in queue`}>
        <StatBadge value={overdue} label="Overdue" color="red" attention={overdue > 0} />
        <StatBadge value={dueToday} label="Due Today" color="amber" />
        <StatBadge value={hot} label="Hot" color="green" attention={hot > 0} />
        <StatBadge value={fresh} label="Fresh" color="blue" />
      </Topbar>
      <QueueClient leads={leads} profiles={(profiles as Profile[]) || []} />
    </>
  );
}
