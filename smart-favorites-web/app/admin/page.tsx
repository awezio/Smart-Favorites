import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/admin";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionPanel } from "@/components/layout/section-panel";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const adminLinks = [
  {
    href: "/admin/showcase",
    title: "Homepage Showcase",
    description: "Manage landing-page carousel slides, images, and order.",
  },
  {
    href: "/admin/ai",
    title: "AI Admin",
    description: "Provider registry, call health, and chat quality metrics.",
  },
];

export default async function AdminHomePage() {
  try {
    await requireAdminUser();
  } catch {
    redirect("/dashboard");
  }

  return (
    <main className="page-shell page-stack">
      <PageHeader
        title="Admin Console"
        description="Hidden management tools for Smart Favorites operators."
        eyebrow="Admin"
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />

      <SectionPanel title="Modules">
        <div className="grid gap-4 md:grid-cols-2">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block border border-border p-4 transition-colors hover:bg-muted/30"
            >
              <h2 className="font-serif text-lg font-semibold">{link.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
            </Link>
          ))}
        </div>
      </SectionPanel>
    </main>
  );
}
