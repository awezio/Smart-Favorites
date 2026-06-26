import Link from "next/link";
import { getAuthUser } from "@/lib/auth/get-user";
import { isAdminRequest } from "@/lib/auth/admin";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionPanel } from "@/components/layout/section-panel";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminAccessDeniedPage() {
  const { user } = await getAuthUser();
  const email = user && "email" in user ? user.email : null;
  const isAdmin = await isAdminRequest();

  if (isAdmin) {
    return (
      <main className="page-shell page-stack">
        <PageHeader
          title="已有管理员权限"
          description="你的账号已通过管理员校验，可以直接进入控制台。"
          eyebrow="Admin"
        />
        <Button asChild>
          <Link href="/admin">进入 Admin 控制台</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="page-shell page-stack">
      <PageHeader
        title="需要管理员权限"
        description="你已登录 Smart Favorites，但当前账号还不是管理员，所以 /admin 会拒绝访问。"
        eyebrow="Admin"
      />

      <SectionPanel title="当前登录账号">
        <p className="text-sm text-muted-foreground">
          {email ? (
            <>
              当前邮箱：<span className="font-medium text-foreground">{email}</span>
            </>
          ) : (
            "未检测到登录邮箱，请先登录后再访问 /admin。"
          )}
        </p>
      </SectionPanel>

      <SectionPanel title="如何开通管理员">
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>任选一种方式即可：</p>
          <ol className="list-decimal space-y-3 pl-5">
            <li>
              在 Vercel 项目环境变量中添加{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">ADMIN_EMAILS</code>
              ，值为你的登录邮箱。多个管理员用英文逗号分隔。保存后需要重新部署一次。
            </li>
            <li>
              在 Supabase Dashboard → Authentication → Users 中，把你的用户的{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">app_metadata.role</code>{" "}
              设为 <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">admin</code>。
            </li>
          </ol>
          <p>
            配置完成后，访问{" "}
            <Link href="/admin" className="text-primary underline-offset-4 hover:underline">
              /admin
            </Link>{" "}
            或{" "}
            <Link href="/admin/showcase" className="text-primary underline-offset-4 hover:underline">
              /admin/showcase
            </Link>
            。
          </p>
        </div>
      </SectionPanel>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/dashboard">返回控制台</Link>
        </Button>
        <Button asChild>
          <Link href="/login?redirect=/admin">重新登录</Link>
        </Button>
      </div>
    </main>
  );
}
