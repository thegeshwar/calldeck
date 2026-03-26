import { getLeadById } from "@/lib/queries/leads";
import { createClient } from "@/lib/supabase/server";
import { Profile, STATUS_LABELS } from "@/lib/types";
import { Topbar } from "@/components/topbar";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { CompanyInfo } from "@/components/profile/company-info";
import { ContactsList } from "@/components/profile/contacts-list";
import { SocialProfiles } from "@/components/profile/social-profiles";
import { PipelineInfo } from "@/components/profile/pipeline-info";
import { FollowupBox } from "@/components/profile/followup-box";
import { ActivityTimeline } from "@/components/profile/activity-timeline";
import { ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LogCallButton } from "./log-call-button";
import { IntelCard } from "@/components/research/intel-card";

const TEMP_COLORS = { hot: "red" as const, warm: "amber" as const, cold: "blue" as const };
const STATUS_COLORS: Record<string, "green" | "amber" | "red" | "blue" | "purple" | "neutral"> = {
  new: "blue", contacted: "amber", interested: "green", meeting_scheduled: "green",
  proposal_sent: "purple", won: "green", lost: "red",
};

export default async function LeadProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) notFound();

  const supabase = await createClient();
  const { data: profiles } = await supabase.from("cd_profiles").select("*");

  return (
    <>
      <Topbar title={lead.company_name} subtitle={lead.city ? `${lead.city}${lead.state ? `, ${lead.state}` : ""}` : undefined}>
        <Link href="/leads">
          <Button variant="ghost" className="flex items-center gap-1.5">
            <ArrowLeft size={12} /> Back
          </Button>
        </Link>
        <Pill color={STATUS_COLORS[lead.status] || "neutral"}>{STATUS_LABELS[lead.status]}</Pill>
        <Pill color={TEMP_COLORS[lead.temperature]} attention={lead.temperature === "hot"}>
          {lead.temperature}
        </Pill>
        <LogCallButton leadId={lead.id} />
      </Topbar>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Company dossier */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <CompanyInfo lead={lead} />
          <ContactsList leadId={lead.id} contacts={lead.contacts} />
          <SocialProfiles leadId={lead.id} profiles={lead.social_profiles} />
          <PipelineInfo lead={lead} profiles={(profiles as Profile[]) || []} />
          <IntelCard lead={lead} />
        </div>

        {/* Right: Activity */}
        <div className="w-[380px] flex-shrink-0 border-l-2 border-border overflow-y-auto p-4 space-y-4">
          <FollowupBox lead={lead} />

          <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted">
            Activity Timeline
          </div>
          <ActivityTimeline
            calls={lead.calls}
            profiles={(profiles as Profile[]) || []}
            createdAt={lead.created_at}
          />
        </div>
      </div>
    </>
  );
}
