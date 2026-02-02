"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  LogOut,
  RefreshCw,
  Plus,
  Trash2,
  Download,
  Settings,
  Loader2,
  X,
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
}

export default function AdminDashboardClient({
  session,
  config,
  stats: initialStats,
  domains: initialDomains,
}: Props) {
  const router = useRouter();
  const [stats, setStats] = useState(initialStats);
  const [domains, setDomains] = useState(initialDomains);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [progressDetails, setProgressDetails] = useState<{
    current: number;
    total: number;
    email?: { from: string; subject: string; date: string };
  } | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [showDomainForm, setShowDomainForm] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newBankName, setNewBankName] = useState("");
  const [error, setError] = useState("");

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
  }

  async function fetchEmails() {
    setLoadingEmails(true);
    setLoadingStatus("Starter...");
    setProgressDetails(null);
    setError("");

    try {
      const eventSource = new EventSource("/api/admin/gmail/emails?stream=true");

      eventSource.addEventListener("status", (e) => {
        const data = JSON.parse(e.data);
        setLoadingStatus(data.message);
      });

      eventSource.addEventListener("progress", (e) => {
        const data = JSON.parse(e.data);
        setLoadingStatus(data.message);
        setProgressDetails({
          current: data.current,
          total: data.total,
          email: data.email,
        });
      });

      eventSource.addEventListener("complete", (e) => {
        const data = JSON.parse(e.data);
        setEmails(data.emails || []);
        setLoadingStatus("");
        setProgressDetails(null);
        setLoadingEmails(false);
        eventSource.close();
      });

      eventSource.addEventListener("error", (e) => {
        if (e instanceof MessageEvent) {
          const data = JSON.parse(e.data);
          setError(data.message || "Failed to fetch emails");
        } else {
          setError("Connection error");
        }
        setLoadingEmails(false);
        eventSource.close();
      });

      eventSource.onerror = () => {
        setError("Connection lost");
        setLoadingEmails(false);
        eventSource.close();
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch emails");
      setLoadingEmails(false);
    }
  }

  async function importEmail(messageId: string) {
    setImporting(messageId);
    setError("");
    try {
      const response = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to import");
      }
      // Refresh emails and stats
      fetchEmails();
      refreshStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import");
    } finally {
      setImporting(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add domain");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove domain");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">Analytikerrapporter</p>
          </div>
          <div className="flex items-center gap-4">
            {session && (
              <span className="text-xs text-gray-500">
                Sesjon utløper: {new Date(session.expiresAt).toLocaleString("nb-NO")}
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

      <div className="max-w-6xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-900 dark:text-red-100">{error}</p>
            </div>
            <button onClick={() => setError("")}>
              <X className="w-4 h-4 text-red-600" />
            </button>
          </div>
        )}

        {/* Config Status */}
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
                  config.gmailConfigured
                    ? "text-green-600"
                    : "text-yellow-600"
                }`}
              />
              <div>
                <h3 className="font-medium">Gmail POP3</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
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
              <Settings
                className={`w-5 h-5 ${
                  config.openRouterConfigured
                    ? "text-green-600"
                    : "text-yellow-600"
                }`}
              />
              <div>
                <h3 className="font-medium">OpenRouter (LLM)</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {config.openRouterConfigured
                    ? "Konfigurert"
                    : "Mangler OPENROUTER_API_KEY"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-600" />
              <div>
                <h3 className="font-medium">{stats.total} rapporter</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.processed} behandlet, {stats.pending} venter
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-500">Totalt</div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Venter
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="text-2xl font-bold text-green-600">{stats.processed}</div>
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Behandlet
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Feilet
            </div>
          </div>
        </div>

        {/* Domain Whitelist */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg mb-6">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold">Godkjente domener</h2>
            <button
              onClick={() => setShowDomainForm(!showDomainForm)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              Legg til
            </button>
          </div>

          {showDomainForm && (
            <form onSubmit={addDomain} className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="domene.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
                />
                <input
                  type="text"
                  placeholder="Banknavn"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Lagre
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDomainForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {domains.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Ingen domener lagt til ennå. Legg til domener for å hente e-poster.
              </div>
            ) : (
              domains.map((domain) => (
                <div
                  key={domain.domain}
                  className="px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono text-sm">{domain.domain}</span>
                    <span className="ml-2 text-gray-500">({domain.bankName})</span>
                  </div>
                  <button
                    onClick={() => removeDomain(domain.domain)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Emails from Gmail */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold">E-poster fra Gmail</h2>
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
              Hent e-poster
            </button>
          </div>

          {!config.gmailConfigured ? (
            <div className="p-8 text-center text-gray-500">
              <p>Konfigurer Gmail for å hente e-poster:</p>
              <code className="block mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                GMAIL_EMAIL=din@email.com<br />
                GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
              </code>
            </div>
          ) : loadingEmails ? (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span className="text-gray-700 dark:text-gray-300 font-medium">{loadingStatus}</span>
              </div>
              {progressDetails && progressDetails.total > 0 && (
                <div className="mb-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(progressDetails.current / progressDetails.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">{progressDetails.current} av {progressDetails.total}</p>
                </div>
              )}
              {progressDetails?.email && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 mb-1">Siste hentet:</p>
                  <p className="text-sm font-medium truncate">{progressDetails.email.subject}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Fra: {progressDetails.email.from} - {progressDetails.email.date}
                  </p>
                </div>
              )}
            </div>
          ) : emails.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Klikk &apos;Hent e-poster&apos; for å laste inn
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-950"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">
                          {email.from.name || email.from.email}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          @{email.domain}
                        </span>
                        {email.imported && (
                          <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                            Importert
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium truncate mb-1">
                        {email.subject}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-3">
                        <span>{new Date(email.date).toLocaleDateString("nb-NO")}</span>
                        {email.attachmentCount > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {email.attachmentCount} vedlegg
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      {email.imported ? (
                        <span className="text-sm text-gray-400">Importert</span>
                      ) : (
                        <button
                          onClick={() => importEmail(email.id)}
                          disabled={importing === email.id}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                        >
                          {importing === email.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                          Importer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
