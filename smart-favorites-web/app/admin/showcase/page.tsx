import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { PageHeader } from "@/components/dashboard/page-header";
import { ShowcaseManager } from "@/components/admin/showcase-manager";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminShowcasePage() {
  await requireAdminPage();

  return (
    <main className="page-shell page-stack">
      <PageHeader
        title="Homepage Showcase"
        description="Manage landing-page carousel slides, image overrides, and display order."
        eyebrow="Admin"
        actions={
          <Button asChild variant="outline">
            <Link href="/admin">Back to admin</Link>
          </Button>
        }
      />
      <ShowcaseManager />
    </main>
  );
}
