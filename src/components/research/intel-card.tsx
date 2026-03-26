"use client";

import { LeadWithRelations } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { ResearchButton } from "./research-button";
import {
  Globe,
  Zap,
  Search,
  Smartphone,
  Building2,
  Star,
  Newspaper,
  Briefcase,
  Users,
  Clock,
} from "lucide-react";

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Globe;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted">
        <Icon size={10} /> {title}
      </div>
      {children}
    </div>
  );
}

export function IntelCard({ lead }: { lead: LeadWithRelations }) {
  const hasResearch = lead.research_status === "done";
  const hasFailed = lead.research_status === "failed";

  if (!hasResearch) {
    return (
      <Card>
        <div className="space-y-3">
          <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted">
            Research Intel
          </div>
          {hasFailed ? (
            <p className="text-xs text-red font-[family-name:var(--font-mono)]">
              Research failed. Click retry.
            </p>
          ) : (
            <p className="text-xs text-text-secondary font-[family-name:var(--font-mono)]">
              Click Research to build a dossier on this lead.
            </p>
          )}
          <ResearchButton leadId={lead.id} status={lead.research_status} />
        </div>
      </Card>
    );
  }

  const speedColor =
    lead.page_speed_score == null
      ? "text-text-muted"
      : lead.page_speed_score < 50
      ? "text-red"
      : lead.page_speed_score < 80
      ? "text-amber"
      : "text-green";

  const hasWebsiteAudit =
    (lead.tech_stack && lead.tech_stack.length > 0) ||
    lead.page_speed_score != null ||
    (lead.seo_issues && lead.seo_issues.length > 0);

  return (
    <Card>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted">
              Research Intel
            </span>
            {lead.researched_at && (
              <span className="flex items-center gap-1 text-[10px] font-[family-name:var(--font-mono)] text-text-muted">
                <Clock size={10} />
                {new Date(lead.researched_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <ResearchButton leadId={lead.id} status={lead.research_status} />
        </div>

        {/* Research Brief */}
        {lead.research_brief && (
          <div className="border-2 border-green-border rounded-lg p-3 space-y-1.5">
            <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-green">
              Your Angle
            </div>
            <p className="text-xs text-text-primary whitespace-pre-line leading-relaxed">
              {lead.research_brief}
            </p>
          </div>
        )}

        {/* Chain Info */}
        {lead.is_chain && (
          <div className="border-2 border-amber-border rounded-lg p-3">
            <Section title="Chain Info" icon={Building2}>
              <p className="text-xs text-text-primary">
                {lead.parent_company && (
                  <span>
                    Part of <span className="text-amber font-bold">{lead.parent_company}</span>
                  </span>
                )}
                {lead.hq_location && (
                  <span className="text-text-secondary"> · HQ: {lead.hq_location}</span>
                )}
              </p>
            </Section>
          </div>
        )}

        {/* Website Audit */}
        {hasWebsiteAudit && (
          <Section title="Website Audit" icon={Globe}>
            <div className="space-y-2">
              {lead.tech_stack && lead.tech_stack.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {lead.tech_stack.map((tech) => (
                    <Pill key={tech} color="blue">
                      {tech}
                    </Pill>
                  ))}
                </div>
              )}
              {lead.page_speed_score != null && (
                <div className="flex items-center gap-1.5 text-xs font-[family-name:var(--font-mono)]">
                  <Zap size={10} className={speedColor} />
                  <span className="text-text-muted">Speed:</span>
                  <span className={`font-bold ${speedColor}`}>
                    {lead.page_speed_score}
                  </span>
                </div>
              )}
              {lead.is_mobile_responsive != null && (
                <div className="flex items-center gap-1.5 text-xs font-[family-name:var(--font-mono)]">
                  <Smartphone
                    size={10}
                    className={
                      lead.is_mobile_responsive ? "text-green" : "text-red"
                    }
                  />
                  <span className="text-text-muted">Mobile:</span>
                  <span
                    className={
                      lead.is_mobile_responsive ? "text-green" : "text-red"
                    }
                  >
                    {lead.is_mobile_responsive ? "Responsive" : "Not responsive"}
                  </span>
                </div>
              )}
              {lead.seo_issues && lead.seo_issues.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-amber">
                    <Search size={10} /> SEO Issues
                  </div>
                  <ul className="space-y-0.5">
                    {lead.seo_issues.map((issue, i) => (
                      <li
                        key={i}
                        className="text-xs text-text-secondary font-[family-name:var(--font-mono)] flex gap-1.5"
                      >
                        <span className="text-text-muted">·</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Reviews */}
        {lead.review_summary && (
          <Section title="Reviews" icon={Star}>
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-3 font-[family-name:var(--font-mono)] text-xs">
                {lead.google_rating != null && (
                  <span>
                    <span className="text-text-muted">Google </span>
                    <span className="text-amber font-bold">
                      {lead.google_rating}★
                    </span>
                    {lead.google_reviews != null && (
                      <span className="text-text-muted">
                        {" "}
                        ({lead.google_reviews})
                      </span>
                    )}
                  </span>
                )}
                {lead.review_summary.yelp_rating != null && (
                  <span>
                    <span className="text-text-muted">Yelp </span>
                    <span className="text-red font-bold">
                      {lead.review_summary.yelp_rating}★
                    </span>
                  </span>
                )}
                {lead.review_summary.bbb_rating != null && (
                  <span>
                    <span className="text-text-muted">BBB </span>
                    <span className="text-blue font-bold">
                      {lead.review_summary.bbb_rating}★
                    </span>
                  </span>
                )}
              </div>
              {lead.review_summary.sentiment && (
                <p className="text-xs text-text-secondary">
                  {lead.review_summary.sentiment}
                </p>
              )}
              {lead.review_summary.notable_complaints &&
                lead.review_summary.notable_complaints.length > 0 && (
                  <ul className="space-y-0.5">
                    {lead.review_summary.notable_complaints.map(
                      (complaint, i) => (
                        <li
                          key={i}
                          className="text-xs text-text-secondary font-[family-name:var(--font-mono)] flex gap-1.5"
                        >
                          <span className="text-text-muted">·</span>
                          {complaint}
                        </li>
                      )
                    )}
                  </ul>
                )}
            </div>
          </Section>
        )}

        {/* Competitors */}
        {lead.competitors && lead.competitors.length > 0 && (
          <Section title="Competitors" icon={Users}>
            <div className="flex flex-wrap gap-1">
              {lead.competitors.map((comp) => (
                <Pill key={comp} color="neutral">
                  {comp}
                </Pill>
              ))}
            </div>
          </Section>
        )}

        {/* Recent News */}
        {lead.research_data?.news && lead.research_data.news.length > 0 && (
          <Section title="Recent News" icon={Newspaper}>
            <div className="space-y-1">
              {lead.research_data.news.map((item, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan hover:underline flex-1 leading-relaxed"
                  >
                    {item.title}
                  </a>
                  {item.date && (
                    <span className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted flex-shrink-0 mt-0.5">
                      {item.date}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Job Postings */}
        {lead.research_data?.job_postings &&
          lead.research_data.job_postings.length > 0 && (
            <Section title="Job Postings" icon={Briefcase}>
              <div className="space-y-1">
                {lead.research_data.job_postings.map((job, i) => (
                  <a
                    key={i}
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-cyan hover:underline leading-relaxed"
                  >
                    {job.title}
                  </a>
                ))}
              </div>
            </Section>
          )}
      </div>
    </Card>
  );
}
