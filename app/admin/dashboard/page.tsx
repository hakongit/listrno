import { redirect } from "next/navigation";
import { isAuthenticated, getSession } from "@/lib/admin-auth";
import { isGmailConfigured } from "@/lib/gmail";
import { isOpenRouterConfigured } from "@/lib/analyst-extraction";
import { getAnalystReportCount, getAllAnalystDomains } from "@/lib/analyst-db";
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

  // Get stats
  const [totalReports, pendingReports, processedReports, failedReports, domains] = await Promise.all([
    getAnalystReportCount(),
    getAnalystReportCount("pending"),
    getAnalystReportCount("processed"),
    getAnalystReportCount("failed"),
    getAllAnalystDomains(),
  ]);

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
    />
  );
}
