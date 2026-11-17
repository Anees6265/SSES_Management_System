import { useState } from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiArrowRight,
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiDatabase,
  FiHeadphones,
  FiLayers,
  FiMail,
  FiPhoneCall,
  FiSend,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import Header from "../../shared/sidebar/Header";
import {
  useGetSupportDevelopersQuery,
  useGetSupportTicketsQuery,
} from "../../../redux/api/authApi";
import { PORTAL_DEVELOPERS } from "./support/supportConstants";
import DeveloperCards from "./support/DeveloperCards";
import QuickMailModal from "./support/QuickMailModal";
import BugReportForm from "./support/BugReportForm";
import TicketTracker from "./support/TicketTracker";
import KnowledgeBase from "./support/KnowledgeBase";

const TABS = [
  { id: "overview", label: "Overview & Developers", icon: FiUsers },
  { id: "report", label: "Report a Bug", icon: FiAlertCircle },
  { id: "tickets", label: "Support Tickets", icon: FiLayers },
  { id: "faq", label: "Help & FAQs", icon: FiBookOpen },
];

export default function Supportfile() {
  const [activeTab, setActiveTab] = useState("overview");
  const [targetDeveloper, setTargetDeveloper] = useState("both");
  const [mailModalState, setMailModalState] = useState({
    isOpen: false,
    developerId: "both",
  });

  const { data: overviewRes } = useGetSupportDevelopersQuery();
  const { data: ticketsOverviewRes } = useGetSupportTicketsQuery({
    status: "all",
    severity: "all",
    search: "",
    scope: "all",
  });

  const overview = overviewRes?.data || {};
  const developers =
    Array.isArray(overview.developers) && overview.developers.length > 0
      ? overview.developers
      : PORTAL_DEVELOPERS;
  const reporter = overview.reporter || null;
  const systemHealth = overview.systemHealth || {
    apiStatus: "Operational",
    databaseStatus: "Connected",
    uptimeSeconds: 0,
  };

  const isDbConnected = systemHealth.databaseStatus === "Connected";

  const ticketStats = ticketsOverviewRes?.stats || {
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    criticalOpen: 0,
  };
  const activeTicketCount = (ticketStats.open || 0) + (ticketStats.in_progress || 0);

  const openDirectMailModal = (target = "both") => {
    const resolvedId = typeof target === "string" ? target : target?.id || "both";
    setMailModalState({ isOpen: true, developerId: resolvedId });
  };

  const handleReportToDeveloper = (target = "both") => {
    const resolvedId = typeof target === "string" ? target : target?.id || "both";
    setTargetDeveloper(resolvedId);
    setActiveTab("report");
  };

  const workflowCards = [
    {
      step: "01",
      title: "Report an Issue",
      description: "Attach screenshots and submit a trackable bug ticket.",
      ctaLabel: "Open Bug Form",
      icon: FiAlertCircle,
      onClick: () => handleReportToDeveloper("both"),
    },
    {
      step: "02",
      title: "Direct Developer Alert",
      description: "Instant email & WhatsApp notification to lead engineers.",
      ctaLabel: "Send Quick Mail",
      icon: FiSend,
      onClick: () => openDirectMailModal("both"),
    },
    {
      step: "03",
      title: "Live Resolution Tracking",
      description: "Track Open, In-Progress, and Resolved statuses in real time.",
      ctaLabel: "View Tickets",
      icon: FiCheckCircle,
      onClick: () => setActiveTab("tickets"),
    },
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => openDirectMailModal("both")}
        className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 cursor-pointer active:scale-95"
      >
        <FiMail className="h-3.5 w-3.5 text-orange-500" />
        <span>Quick Email</span>
      </button>
      <button
        type="button"
        onClick={() => handleReportToDeveloper("both")}
        className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-orange-600 active:scale-95 cursor-pointer"
      >
        <FiAlertCircle className="h-3.5 w-3.5" />
        <span>Report Bug</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-color)] pb-14">
      <Header
        title="Support & Help"
        badge="Help Desk"
        actions={headerActions}
        breadcrumbs={[{ label: "Support & Help" }]}
      />

      <div className="w-full space-y-4 sm:space-y-6 px-3.5 py-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
        {/* ── 1. Hero Command Card ── */}
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white shadow-xs">
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" />

          <div className="relative flex flex-col gap-6 p-5 sm:p-7 xl:flex-row xl:items-center xl:justify-between">
            {/* Left Content */}
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                  <FiHeadphones className="h-3.5 w-3.5 text-orange-500" />
                  Engineering Support Desk
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Help Desk
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Portal Support &amp; Developer Assistance
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                Report system bugs, UI glitches, or get direct assistance from our development team via Call, WhatsApp, or support ticket.
              </p>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleReportToDeveloper("both")}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-orange-600 active:scale-95 cursor-pointer"
                >
                  <FiAlertCircle className="h-4 w-4" />
                  <span>Report a Bug</span>
                </button>

                <button
                  type="button"
                  onClick={() => openDirectMailModal("both")}
                  className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-xs sm:text-sm font-bold text-orange-700 transition hover:bg-orange-100 active:scale-95 cursor-pointer"
                >
                  <FiMail className="h-4 w-4 text-orange-600" />
                  <span>Direct Mail</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("tickets")}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 shadow-2xs transition hover:border-orange-300 hover:bg-slate-50 active:scale-95 cursor-pointer"
                >
                  <FiLayers className="h-4 w-4 text-orange-500" />
                  <span>Track Tickets</span>
                  {activeTicketCount > 0 && (
                    <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-extrabold text-white">
                      {activeTicketCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Right System Status Grid */}
            <div className="grid grid-cols-2 gap-3 xl:w-[420px] shrink-0">
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 transition hover:border-orange-200 hover:bg-white shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <span>API Gateway</span>
                  <FiActivity className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <p className="mt-2 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  {systemHealth.apiStatus || "Operational"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 transition hover:border-orange-200 hover:bg-white shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Database</span>
                  <FiDatabase className={`h-3.5 w-3.5 ${isDbConnected ? "text-emerald-600" : "text-amber-600"}`} />
                </div>
                <p className="mt-2 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <span className={`h-2 w-2 rounded-full ${isDbConnected ? "bg-emerald-500" : "bg-amber-500"}`} />
                  {systemHealth.databaseStatus || "Connected"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 transition hover:border-orange-200 hover:bg-white shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Server Status</span>
                  <FiClock className="h-3.5 w-3.5 text-orange-500" />
                </div>
                <p className="mt-2 text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Online &amp; Active
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 transition hover:border-orange-200 hover:bg-white shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Ticket Queue</span>
                  <FiCheckCircle className="h-3.5 w-3.5 text-orange-500" />
                </div>
                <p className="mt-2 text-sm font-extrabold text-slate-900">
                  {activeTicketCount} Open · {ticketStats.resolved || 0} Fixed
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. Segmented Navigation Bar & Instant Hotlines ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-orange-500 text-white shadow-xs"
                      : "text-slate-600 hover:bg-orange-50 hover:text-orange-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.id === "tickets" && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                        isActive
                          ? "bg-white/25 text-white"
                          : activeTicketCount > 0
                          ? "bg-orange-100 text-orange-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {activeTicketCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Clickable Developer Hotlines */}
          <div className="hidden lg:flex items-center gap-2 pr-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <FiPhoneCall className="h-3.5 w-3.5 text-orange-500" />
              Hotlines:
            </span>
            {developers.map((dev) => (
              <a
                key={dev.id}
                href={dev.telHref}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                title={`Call ${dev.name}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>{dev.name.split(" ")[0]}:</span>
                <span className="font-mono text-orange-700">{dev.mobile}</span>
              </a>
            ))}
          </div>
        </div>

        {/* ── 3. Active Tab Panels ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Developer Profiles */}
            <DeveloperCards
              developers={developers}
              onOpenDirectMail={openDirectMailModal}
              onReportToDeveloper={handleReportToDeveloper}
            />

            {/* 3-Step Quick Workflow Cards */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {workflowCards.map((item) => {
                const StepIcon = item.icon;
                return (
                  <div
                    key={item.step}
                    onClick={item.onClick}
                    className="group rounded-2xl border border-slate-200/90 bg-white p-5 text-left shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500 font-mono text-xs font-black text-white shadow-2xs">
                          {item.step}
                        </span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition group-hover:bg-orange-100">
                          <StepIcon className="h-4 w-4" />
                        </span>
                      </div>
                      <h4 className="mt-3.5 text-sm font-extrabold text-slate-900 group-hover:text-orange-600 transition-colors">
                        {item.title}
                      </h4>
                      <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                    <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-orange-600">
                      <span>{item.ctaLabel}</span>
                      <FiArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Clean Help Desk Notice */}
            <div className="rounded-2xl border border-orange-200/80 bg-gradient-to-r from-orange-50/60 via-white to-amber-50/40 p-4 sm:p-5 shadow-2xs">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                    <FiShield className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900">
                      Role-Based Support Desk
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      All faculty and staff members can submit bug reports. Ticket resolution is actively managed by portal developers.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("faq")}
                  className="shrink-0 rounded-xl border border-orange-200 bg-white px-3.5 py-2 text-xs font-bold text-orange-700 transition hover:bg-orange-50 cursor-pointer shadow-2xs"
                >
                  Browse FAQs →
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "report" && (
          <BugReportForm
            developers={developers}
            reporter={reporter}
            initialTargetDeveloper={targetDeveloper}
            onTicketCreated={() => setActiveTab("tickets")}
            onViewTickets={() => setActiveTab("tickets")}
          />
        )}

        {activeTab === "tickets" && (
          <TicketTracker onReportNewBug={() => handleReportToDeveloper("both")} />
        )}

        {activeTab === "faq" && (
          <KnowledgeBase
            onReportBug={() => handleReportToDeveloper("both")}
            onOpenDirectMail={openDirectMailModal}
          />
        )}
      </div>

      {/* Quick Direct Mail Modal */}
      <QuickMailModal
        isOpen={mailModalState.isOpen}
        initialDeveloperId={mailModalState.developerId}
        developers={developers}
        onClose={() => setMailModalState((prev) => ({ ...prev, isOpen: false }))}
        onSent={() => setActiveTab("tickets")}
      />
    </div>
  );
}
