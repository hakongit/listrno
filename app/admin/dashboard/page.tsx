import { redirect } from "next/navigation";
import { isAuthenticated, getSession } from "@/lib/admin-auth";
import { isGmailConfigured } from "@/lib/gmail";
import { isOpenRouterConfigured } from "@/lib/analyst-extraction";
import { getAnalystReportCount, getAllAnalystDomains, getAllAnalystReports } from "@/lib/analyst-db";
import { initializeAnalystDatabase } from "@/lib/analyst-db";
import AdminDashboardClient from "./client";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect("/admin");
  }

  // Initialize database tables if needed
  await initializeAnalystDatabase();

  const session = await getSession();

  // Check configuration status
  const gmailConfigured = isGmailConfigured();
  const openRouterConfigured = isOpenRouterConfigured();

  // Get stats and existing reports
  const [totalReports, pendingReports, processedReports, failedReports, domains, existingReports] = await Promise.all([
    getAnalystReportCount(),
    getAnalystReportCount("pending"),
    getAnalystReportCount("processed"),
    getAnalystReportCount("failed"),
    getAllAnalystDomains(),
    getAllAnalystReports({ limit: 50 }),
  ]);

  console.log("[admin] existingReports:", existingReports.length, existingReports.map(r => ({ id: r.id, gmail: r.gmailMessageId, subject: r.subject })));

  // Convert DB reports to EmailItem format for initial display
  const whitelistedDomains = new Set(domains.map(d => d.domain.toLowerCase()));
  const initialEmails = existingReports.map(r => ({
    id: r.gmailMessageId,
    from: { email: r.fromEmail, name: r.fromEmail },
    domain: r.fromDomain,
    subject: r.subject,
    date: r.receivedDate,
    snippet: "",
    attachmentCount: 0,
    imported: true,
    reportId: r.id,
    isWhitelisted: whitelistedDomains.has(r.fromDomain.toLowerCase()),
  }));

  return (
    <AdminDashboardClient
      session={session}
      config={{
        gmailConfigured,
        openRouterConfigured,
      }}
      stats={{
        total: totalReports,
        pending: pendingReports,
        processed: processedReports,
        failed: failedReports,
      }}
      domains={domains}
      initialEmails={initialEmails}
    />
  );
}
