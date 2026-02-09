"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  FileText,
  CheckCircle,
  AlertCircle,
  LogOut,
  RefreshCw,
  Plus,
  Trash2,
  Download,
  Loader2,
  X,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Zap,
  Server,
  Search,
  Shield,
} from "lucide-react";
import { AnalystDomain } from "@/lib/analyst-types";

interface Props {
  session: { expiresAt: Date } | null;
  config: {
    gmailConfigured: boolean;
    openRouterConfigured: boolean;
  };
  stats: {
    total: number;
    pending: number;
    processed: number;
    failed: number;
  };
  domains: AnalystDomain[];
  initialEmails?: EmailItem[];
}

interface EmailItem {
  id: string;
  from: { email: string; name?: string };
  domain: string;
  subject: string;
  date: string;
  snippet: string;
  attachmentCount: number;
  imported: boolean;
  reportId?: number;
  isWhitelisted?: boolean;
}

interface LogEntry {
  id: number;
  timestamp: Date;
  level: "info" | "success" | "warn" | "error" | "progress";
  message: string;
  detail?: string;
}

interface ProcessResult {
  emailId: string;
  success: boolean;
  extracted?: {
    companyName?: string;
    recommendation?: string;
    targetPrice?: number;
    targetCurrency?: string;
    investmentBank?: string;
    summary?: string;
  };
  error?: string;
  extractionFailed?: boolean;
}

export default function AdminDashboardClient({
  session,
  config,
  stats: initialStats,
  domains: initialDomains,
  initialEmails = [],
}: Props) {
  const router = useRouter();
  const [stats, setStats] = useState(initialStats);
  const [domains, setDomains] = useState(initialDomains);
  const [emails, setEmails] = useState<EmailItem[]>(initialEmails);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showDomainForm, setShowDomainForm] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newBankName, setNewBankName] = useState("");
  const [error, setError] = useState("");
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [processResults, setProcessResults] = useState<Map<string, ProcessResult>>(new Map());
  const [approvingDomain, setApprovingDomain] = useState<string | null>(null);
  const [approveBankName, setApproveBankName] = useState("");

  // Activity log
  const [log, setLog] = useState<LogEntry[]>([]);
  const [showLog, setShowLog] = useState(true);
  const logIdRef = useRef(0);
  const completedRef = useRef(false);

  function addLog(level: LogEntry["level"], message: string, detail?: string) {
    const entry: LogEntry = {
      id: logIdRef.current++,
      timestamp: new Date(),
      level,
      message,
      detail,
    };
    setLog((prev) => [...prev, entry]);
  }

  function clearLog() {
    setLog([]);
    logIdRef.current = 0;
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
  }

  async function fetchEmails() {
    setLoadingEmails(true);
    clearLog();
    setError("");
    setEmails([]);
    setProcessResults(new Map());
    completedRef.current = false;

    addLog("info", "Starter e-posthenting...");

    try {
      const eventSource = new EventSource("/api/admin/gmail/emails?stream=true&maxResults=20");

      eventSource.addEventListener("status", (e) => {
        const data = JSON.parse(e.data);
        addLog("info", data.message);
      });

      eventSource.addEventListener("progress", (e) => {
        const data = JSON.parse(e.data);
        if (data.stage === "connect") {
          addLog("info", "Kobler til pop.gmail.com:995 (TLS)...");
        } else if (data.stage === "connected") {
          addLog("success", "Tilkoblet POP3-server");
        } else if (data.stage === "stat") {
          addLog("info", data.message);
        } else if (data.stage === "list") {
          addLog("info", data.message);
        } else if (data.stage === "fetched" && data.email) {
          addLog(
            "progress",
            `[${data.current}/${data.total}] ${data.email.subject}`,
            `Fra: ${data.email.from} | ${data.email.date}`
          );
        } else if (data.stage === "done") {
          addLog("success", data.message);
        } else if (data.stage === "auto-import") {
          addLog("progress", `[Auto-import ${data.current}/${data.total}] ${data.message}`);
        } else if (data.stage === "auto-import-error") {
          addLog("warn", `[Auto-import ${data.current}/${data.total}] ${data.message}`);
        } else {
          addLog("info", data.message);
        }
      });

      eventSource.addEventListener("complete", (e) => {
        completedRef.current = true;
        const data = JSON.parse(e.data);
        const emailList: EmailItem[] = data.emails || [];
        setEmails(emailList);

        const whitelisted = emailList.filter((e) => e.isWhitelisted).length;
        const withAttachments = emailList.filter((e) => e.attachmentCount > 0).length;
        const alreadyImported = emailList.filter((e) => e.imported).length;

        addLog(
          "success",
          `Ferdig! ${emailList.length} e-poster hentet`,
          [
            `${whitelisted} fra godkjente domener`,
            `${withAttachments} med vedlegg`,
            `${alreadyImported} allerede importert`,
          ].join(" · ")
        );

        setLoadingEmails(false);
        eventSource.close();
      });

      eventSource.addEventListener("error", (e) => {
        if (e instanceof MessageEvent) {
          const data = JSON.parse(e.data);
          addLog("error", data.message || "Feil ved henting");
          setError(data.message || "Failed to fetch emails");
        }
        setLoadingEmails(false);
        eventSource.close();
      });

      eventSource.onerror = () => {
        // SSE fires onerror when stream closes — ignore if we got "complete"
        if (!completedRef.current) {
          addLog("error", "Tilkobling til server brutt");
          setError("Tilkobling til server brutt. Prøv igjen.");
        }
        setLoadingEmails(false);
        eventSource.close();
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Feil ved henting";
      addLog("error", msg);
      setError(msg);
      setLoadingEmails(false);
    }
  }

  async function importEmail(messageId: string, autoProcess: boolean = false) {
    setImporting(messageId);
    setError("");
    addLog("info", `Importerer e-post...`, messageId);
    try {
      const response = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, autoProcess }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to import");
      }
      setEmails((prev) =>
        prev.map((e) =>
          e.id === messageId ? { ...e, imported: true, reportId: data.report?.id } : e
        )
      );

      if (data.extracted) {
        setProcessResults((prev) => {
          const next = new Map(prev);
          next.set(messageId, {
            emailId: messageId,
            success: !data.extractionFailed,
            extracted: data.extracted,
            error: data.extractionError,
            extractionFailed: data.extractionFailed,
          });
          return next;
        });
      }

      if (data.extractionFailed) {
        addLog("warn", `Importert, men ekstraksjon feilet: ${data.extractionError}`);
      } else if (data.extracted) {
        addLog(
          "success",
          `Importert og behandlet: ${data.extracted.companyName || "Ukjent selskap"}`,
          [
            data.extracted.recommendation,
            data.extracted.targetPrice
              ? `Kursmål: ${data.extracted.targetPrice} ${data.extracted.targetCurrency || "NOK"}`
              : null,
            data.extracted.investmentBank,
          ]
            .filter(Boolean)
            .join(" · ")
        );
      } else {
        addLog("success", "E-post importert (ikke behandlet)");
      }

      refreshStats();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Feil ved import";
      addLog("error", msg);
      setError(msg);
    } finally {
      setImporting(null);
    }
  }

  async function processEmail(messageId: string) {
    setProcessing(messageId);
    setError("");
    const email = emails.find((e) => e.id === messageId);

    addLog(
      "info",
      `Behandler: ${email?.subject || messageId}`,
      email?.attachmentCount
        ? `${email.attachmentCount} vedlegg vil bli ekstrahert`
        : "Ingen vedlegg"
    );

    try {
      if (!email?.imported) {
        await importEmail(messageId, true);
      } else {
        const response = await fetch("/api/admin/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, autoProcess: true }),
        });
        const data = await response.json();
        if (!response.ok) {
          if (!data.error?.includes("already imported")) {
            throw new Error(data.error || "Failed to process");
          }
          addLog("info", "Allerede importert");
        } else if (data.extracted) {
          setProcessResults((prev) => {
            const next = new Map(prev);
            next.set(messageId, {
              emailId: messageId,
              success: !data.extractionFailed,
              extracted: data.extracted,
              error: data.extractionError,
              extractionFailed: data.extractionFailed,
            });
            return next;
          });
          if (data.extractionFailed) {
            addLog("warn", `Ekstraksjon feilet: ${data.extractionError}`);
          } else {
            addLog(
              "success",
              `Behandlet: ${data.extracted.companyName || "Ukjent selskap"}`,
              [
                data.extracted.recommendation,
                data.extracted.targetPrice
                  ? `Kursmål: ${data.extracted.targetPrice} ${data.extracted.targetCurrency || "NOK"}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")
            );
          }
        }
        refreshStats();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Feil ved behandling";
      addLog("error", msg);
      setError(msg);
    } finally {
      setProcessing(null);
    }
  }

  async function refreshStats() {
    try {
      const response = await fetch("/api/admin/reports?limit=1");
      if (response.ok) {
        const data = await response.json();
        setStats({
          total: data.total,
          pending: data.counts.pending,
          processed: data.counts.processed,
          failed: data.counts.failed,
        });
      }
    } catch {
      // Ignore
    }
  }

  async function addDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomain || !newBankName) return;
    try {
      const response = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain, bankName: newBankName }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add domain");
      }
      const data = await response.json();
      setDomains(data.domains);
      setNewDomain("");
      setNewBankName("");
      setShowDomainForm(false);
      addLog("success", `Domene lagt til: ${newDomain} (${newBankName})`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add domain");
    }
  }

  async function approveDomain(domain: string, bankName: string) {
    if (!bankName.trim()) return;
    try {
      const response = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, bankName: bankName.trim() }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add domain");
      }
      const data = await response.json();
      setDomains(data.domains);
      // Update email whitelist status
      setEmails((prev) =>
        prev.map((e) =>
          e.domain.toLowerCase() === domain.toLowerCase()
            ? { ...e, isWhitelisted: true }
            : e
        )
      );
      setApprovingDomain(null);
      setApproveBankName("");
      addLog("success", `Domene godkjent: ${domain} (${bankName.trim()})`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve domain");
    }
  }

  async function deleteReport(messageId: string, reportId: number) {
    setError("");
    addLog("info", `Sletter rapport #${reportId}...`);
    try {
      const response = await fetch("/api/admin/reports", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reportId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete");
      }
      setEmails((prev) =>
        prev.map((e) =>
          e.id === messageId ? { ...e, imported: false, reportId: undefined } : e
        )
      );
      setProcessResults((prev) => {
        const next = new Map(prev);
        next.delete(messageId);
        return next;
      });
      addLog("success", `Rapport #${reportId} slettet`);
      refreshStats();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Feil ved sletting";
      addLog("error", msg);
      setError(msg);
    }
  }

  async function removeDomain(domain: string) {
    try {
      const response = await fetch("/api/admin/domains", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove domain");
      }
      const data = await response.json();
      setDomains(data.domains);
      addLog("info", `Domene fjernet: ${domain}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove domain");
    }
  }

  const logLevelIcon = (level: LogEntry["level"]) => {
    switch (level) {
      case "success":
        return <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />;
      case "error":
        return <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />;
      case "warn":
        return <AlertCircle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />;
      case "progress":
        return <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      default:
        return <Server className="w-3.5 h-3.5 text-gray-400 shrink-0" />;
    }
  };

  const whitelistedEmails = emails.filter((e) => e.isWhitelisted);
  const otherEmails = emails.filter((e) => !e.isWhitelisted);

  // Compute suggested domains: unique domains from fetched emails, excluding already-approved
  const approvedDomainSet = new Set(domains.map((d) => d.domain.toLowerCase()));
  const domainCounts = new Map<string, { count: number; sampleSender: string }>();
  for (const email of emails) {
    const d = email.domain.toLowerCase();
    if (!approvedDomainSet.has(d)) {
      const existing = domainCounts.get(d);
      if (existing) {
        existing.count++;
      } else {
        domainCounts.set(d, { count: 1, sampleSender: email.from.name || email.from.email });
      }
    }
  }
  const suggestedDomains = Array.from(domainCounts.entries())
    .map(([domain, { count, sampleSender }]) => ({ domain, count, sampleSender }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">Analytikerrapporter</p>
          </div>
          <div className="flex items-center gap-4">
            {session && (
              <span className="text-xs text-gray-500">
                Sesjon utl&oslash;per: {new Date(session.expiresAt).toLocaleString("nb-NO")}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <LogOut className="w-4 h-4" />
              Logg ut
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
            </div>
            <button onClick={() => setError("")}>
              <X className="w-4 h-4 text-red-600" />
            </button>
          </div>
        )}

        {/* Config + Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div
            className={`p-4 rounded-lg border ${
              config.gmailConfigured
                ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                : "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <Mail
                className={`w-5 h-5 ${
                  config.gmailConfigured ? "text-green-600" : "text-yellow-600"
                }`}
              />
              <div>
                <h3 className="font-medium text-sm">Gmail POP3</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {config.gmailConfigured
                    ? "Konfigurert"
                    : "Mangler GMAIL_EMAIL / GMAIL_APP_PASSWORD"}
                </p>
              </div>
            </div>
          </div>

          <div
            className={`p-4 rounded-lg border ${
              config.openRouterConfigured
                ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                : "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <Zap
                className={`w-5 h-5 ${
                  config.openRouterConfigured ? "text-green-600" : "text-yellow-600"
                }`}
              />
              <div>
                <h3 className="font-medium text-sm">OpenRouter (LLM)</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {config.openRouterConfigured
                    ? "Konfigurert"
                    : "Mangler OPENROUTER_API_KEY"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-600" />
              <div>
                <h3 className="font-medium text-sm">{stats.total} rapporter</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="text-green-600">{stats.processed} behandlet</span>
                  {" / "}
                  <span className="text-yellow-600">{stats.pending} venter</span>
                  {stats.failed > 0 && (
                    <>
                      {" / "}
                      <span className="text-red-600">{stats.failed} feilet</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Two-column layout: Domains + Activity Log */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Domain Whitelist + Suggestions */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-500" />
                <h2 className="font-semibold text-sm">Godkjente domener</h2>
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">
                  {domains.length}
                </span>
              </div>
              <button
                onClick={() => setShowDomainForm(!showDomainForm)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Legg til
              </button>
            </div>

            {showDomainForm && (
              <form
                onSubmit={addDomain}
                className="p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="domene.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
                  />
                  <input
                    type="text"
                    placeholder="Banknavn"
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Lagre
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-36 overflow-y-auto">
              {domains.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  Ingen domener lagt til enn&aring;.
                </div>
              ) : (
                domains.map((domain) => (
                  <div
                    key={domain.domain}
                    className="px-4 py-2 flex items-center justify-between text-sm"
                  >
                    <div>
                      <span className="font-mono text-xs">{domain.domain}</span>
                      <span className="ml-2 text-gray-500 text-xs">({domain.bankName})</span>
                    </div>
                    <button
                      onClick={() => removeDomain(domain.domain)}
                      className="text-red-500 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Suggested domains from fetched emails */}
            {suggestedDomains.length > 0 && (
              <>
                <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-950/30 border-t border-b border-gray-200 dark:border-gray-800">
                  <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400 uppercase tracking-wide">
                    Nye domener funnet ({suggestedDomains.length})
                  </span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-48 overflow-y-auto">
                  {suggestedDomains.map(({ domain, count, sampleSender }) => (
                    <div key={domain} className="px-4 py-2">
                      {approvingDomain === domain ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs shrink-0">{domain}</span>
                          <input
                            type="text"
                            placeholder="Banknavn"
                            value={approveBankName}
                            onChange={(e) => setApproveBankName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                approveDomain(domain, approveBankName);
                              }
                              if (e.key === "Escape") {
                                setApprovingDomain(null);
                                setApproveBankName("");
                              }
                            }}
                            autoFocus
                            className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
                          />
                          <button
                            onClick={() => approveDomain(domain, approveBankName)}
                            className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Lagre
                          </button>
                          <button
                            onClick={() => {
                              setApprovingDomain(null);
                              setApproveBankName("");
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700 px-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <span className="font-mono text-xs">{domain}</span>
                            <span className="ml-2 text-gray-400 text-xs">
                              {count} e-post{count !== 1 ? "er" : ""}
                            </span>
                            <span className="ml-1 text-gray-400 text-xs truncate">
                              ({sampleSender})
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setApprovingDomain(domain);
                              // Guess a bank name from the domain
                              const guess = domain
                                .replace(/\.(no|com|se|dk|fi|eu|co\.uk)$/i, "")
                                .replace(/[-_]/g, " ")
                                .replace(/\b\w/g, (c) => c.toUpperCase());
                              setApproveBankName(guess);
                            }}
                            className="flex items-center gap-1 text-xs px-2 py-1 text-green-600 border border-green-300 dark:border-green-700 rounded hover:bg-green-50 dark:hover:bg-green-950 shrink-0"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Godkjenn
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Activity Log */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-500" />
                <h2 className="font-semibold text-sm">Aktivitetslogg</h2>
                {log.length > 0 && (
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">
                    {log.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {log.length > 0 && (
                  <button
                    onClick={clearLog}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    T&oslash;m
                  </button>
                )}
                <button
                  onClick={() => setShowLog(!showLog)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {showLog ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {showLog && (
              <div className="max-h-48 overflow-y-auto font-mono text-xs">
                {log.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500 font-sans">
                    Loggen er tom. Klikk &quot;Hent e-poster&quot; for &aring; starte.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                    {log.map((entry) => (
                      <div key={entry.id} className="px-3 py-1.5 flex items-start gap-2 hover:bg-gray-50 dark:hover:bg-gray-950">
                        <span className="text-gray-400 shrink-0 tabular-nums pt-0.5">
                          {entry.timestamp.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                        <span className="pt-0.5">{logLevelIcon(entry.level)}</span>
                        <div className="min-w-0">
                          <span
                            className={
                              entry.level === "error"
                                ? "text-red-600"
                                : entry.level === "success"
                                ? "text-green-600"
                                : entry.level === "warn"
                                ? "text-yellow-600"
                                : "text-gray-700 dark:text-gray-300"
                            }
                          >
                            {entry.message}
                          </span>
                          {entry.detail && (
                            <span className="block text-gray-400 truncate">{entry.detail}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {loadingEmails && (
                      <div className="px-3 py-1.5 flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                        <span className="text-blue-500">Henter...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Email Fetch + List */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-sm">E-poster fra Gmail</h2>
              {emails.length > 0 && (
                <>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                    {emails.length} totalt
                  </span>
                  {whitelistedEmails.length > 0 && (
                    <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                      {whitelistedEmails.length} fra godkjente
                    </span>
                  )}
                </>
              )}
            </div>
            <button
              onClick={fetchEmails}
              disabled={loadingEmails || !config.gmailConfigured}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
            >
              {loadingEmails ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {loadingEmails ? "Henter..." : "Hent e-poster"}
            </button>
          </div>

          {!config.gmailConfigured ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-sm">Konfigurer Gmail for &aring; hente e-poster:</p>
              <code className="block mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                GMAIL_EMAIL=din@email.com
                <br />
                GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
              </code>
            </div>
          ) : emails.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              {loadingEmails ? "Henter e-poster..." : "Klikk \"Hent e-poster\" for \u00e5 laste inn"}
            </div>
          ) : (
            <div>
              {/* Whitelisted emails first */}
              {whitelistedEmails.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-green-50 dark:bg-green-950/50 border-b border-gray-200 dark:border-gray-800">
                    <span className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide">
                      Fra godkjente domener ({whitelistedEmails.length})
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {whitelistedEmails.map((email) => (
                      <EmailRow
                        key={email.id}
                        email={email}
                        expanded={expandedEmail === email.id}
                        onToggle={() =>
                          setExpandedEmail(expandedEmail === email.id ? null : email.id)
                        }
                        importing={importing === email.id}
                        processing={processing === email.id}
                        processResult={processResults.get(email.id)}
                        onImport={() => importEmail(email.id, false)}
                        onProcess={() => processEmail(email.id)}
                        onDelete={() => email.reportId && deleteReport(email.id, email.reportId)}
                        openRouterConfigured={config.openRouterConfigured}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Other emails */}
              {otherEmails.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-950/50 border-b border-t border-gray-200 dark:border-gray-800">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Andre e-poster ({otherEmails.length})
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {otherEmails.map((email) => (
                      <EmailRow
                        key={email.id}
                        email={email}
                        expanded={expandedEmail === email.id}
                        onToggle={() =>
                          setExpandedEmail(expandedEmail === email.id ? null : email.id)
                        }
                        importing={importing === email.id}
                        processing={processing === email.id}
                        processResult={processResults.get(email.id)}
                        onImport={() => importEmail(email.id, false)}
                        onProcess={() => processEmail(email.id)}
                        onDelete={() => email.reportId && deleteReport(email.id, email.reportId)}
                        openRouterConfigured={config.openRouterConfigured}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmailRow({
  email,
  expanded,
  onToggle,
  importing,
  processing,
  processResult,
  onImport,
  onProcess,
  onDelete,
  openRouterConfigured,
}: {
  email: EmailItem;
  expanded: boolean;
  onToggle: () => void;
  importing: boolean;
  processing: boolean;
  processResult?: ProcessResult;
  onImport: () => void;
  onProcess: () => void;
  onDelete: () => void;
  openRouterConfigured: boolean;
}) {
  const [fullBody, setFullBody] = useState<string | null>(null);
  const [loadingBody, setLoadingBody] = useState(false);
  const [attachments, setAttachments] = useState<{ filename: string; contentType: string }[]>([]);

  useEffect(() => {
    if (expanded && fullBody === null && !loadingBody) {
      setLoadingBody(true);
      fetch("/api/admin/gmail/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: email.id }),
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data) {
            setFullBody(data.body || "(Ingen innhold)");
            setAttachments(data.attachments || []);
          } else {
            setFullBody(email.snippet || "(Kunne ikke hente innhold)");
          }
        })
        .catch(() => setFullBody(email.snippet || "(Feil ved henting)"))
        .finally(() => setLoadingBody(false));
    }
  }, [expanded, fullBody, loadingBody, email.id, email.snippet]);

  return (
    <div
      className={`${
        email.isWhitelisted ? "border-l-2 border-l-green-500" : ""
      }`}
    >
      <div
        className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-950 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="text-sm font-medium truncate">
                {email.from.name || email.from.email}
              </span>
              <span
                className={`text-xs font-mono px-1 py-0.5 rounded ${
                  email.isWhitelisted
                    ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                }`}
              >
                @{email.domain}
              </span>
              {email.imported && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                  Importert
                </span>
              )}
              {processResult?.success && (
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                  Behandlet
                </span>
              )}
              {processResult?.extractionFailed && (
                <span className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded">
                  Feil
                </span>
              )}
            </div>
            <div className="text-sm truncate mb-1">{email.subject}</div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{new Date(email.date).toLocaleString("nb-NO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              {email.attachmentCount > 0 && (
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <Paperclip className="w-3 h-3" />
                  {email.attachmentCount} vedlegg
                </span>
              )}
              <span className="text-gray-400 font-mono text-[10px] truncate max-w-[200px]">
                {email.id}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            {email.imported && email.reportId ? (
              <button
                onClick={onDelete}
                className="flex items-center gap-1 text-xs px-2 py-1 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50"
                title="Slett rapport"
              >
                <Trash2 className="w-3 h-3" />
                Slett
              </button>
            ) : !email.imported ? (
              <button
                onClick={onImport}
                disabled={importing}
                className="flex items-center gap-1 text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                title="Importer uten LLM-behandling"
              >
                {importing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                Lagre
              </button>
            ) : null}
            {openRouterConfigured && (
              <button
                onClick={onProcess}
                disabled={processing || importing}
                className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                title="Importer og ekstraher data med LLM"
              >
                {processing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className="w-3 h-3" />
                )}
                Behandle
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
          {/* Full email body */}
          <div className="pt-3">
            <p className="text-xs font-medium text-gray-500 mb-1">E-postinnhold:</p>
            {loadingBody ? (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                Henter innhold...
              </div>
            ) : (
              <div className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap max-h-80 overflow-y-auto bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-3">
                {fullBody || email.snippet || "(Ingen tekst)"}
              </div>
            )}
            {attachments.length > 0 && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {attachments.map((att, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                    <Paperclip className="w-3 h-3" />
                    {att.filename}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Process result */}
          {processResult?.extracted && (
            <div className="mt-3 p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 mb-2">Ekstraherte data:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {processResult.extracted.companyName && (
                  <>
                    <span className="text-gray-500">Selskap:</span>
                    <span className="font-medium">{processResult.extracted.companyName}</span>
                  </>
                )}
                {processResult.extracted.investmentBank && (
                  <>
                    <span className="text-gray-500">Bank:</span>
                    <span>{processResult.extracted.investmentBank}</span>
                  </>
                )}
                {processResult.extracted.recommendation && (
                  <>
                    <span className="text-gray-500">Anbefaling:</span>
                    <span
                      className={`font-medium ${
                        processResult.extracted.recommendation.toLowerCase().includes("kjøp") ||
                        processResult.extracted.recommendation.toLowerCase().includes("buy")
                          ? "text-green-600"
                          : processResult.extracted.recommendation.toLowerCase().includes("selg") ||
                            processResult.extracted.recommendation.toLowerCase().includes("sell")
                          ? "text-red-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {processResult.extracted.recommendation}
                    </span>
                  </>
                )}
                {processResult.extracted.targetPrice && (
                  <>
                    <span className="text-gray-500">Kursm&aring;l:</span>
                    <span className="font-medium">
                      {processResult.extracted.targetPrice}{" "}
                      {processResult.extracted.targetCurrency || "NOK"}
                    </span>
                  </>
                )}
                {processResult.extracted.summary && (
                  <div className="col-span-2 mt-1 pt-1 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500">Sammendrag: </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {processResult.extracted.summary}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {processResult?.error && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 rounded text-xs text-red-600">
              Feil: {processResult.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
