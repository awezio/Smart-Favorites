import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const replacements = [
  ["border-sky-100", "border-border"],
  ["border-sky-200", "border-border"],
  ["border-sky-50", "border-border/60"],
  ["border-sky-300", "border-primary/30"],
  ["bg-sky-100/60", "bg-muted/40"],
  ["bg-sky-100/70", "bg-muted/50"],
  ["bg-sky-50/60", "bg-muted/40"],
  ["bg-sky-50/70", "bg-muted/50"],
  ["bg-sky-50", "bg-primary/5"],
  ["bg-sky-100", "bg-primary/10"],
  ["bg-sky-600", "bg-primary"],
  ["hover:bg-sky-700", "hover:bg-primary/90"],
  ["hover:bg-sky-50", "hover:bg-accent"],
  ["hover:bg-sky-100", "hover:bg-primary/10"],
  ["text-sky-800", "text-primary"],
  ["text-sky-700", "text-primary"],
  ["text-sky-600", "text-primary"],
  ["text-sky-500", "text-primary"],
  ["text-sky-200", "text-primary/30"],
  ["text-sky-50", "text-primary/5"],
  ["text-slate-950", "text-foreground"],
  ["text-slate-800", "text-foreground"],
  ["text-slate-700", "text-muted-foreground"],
  ["text-slate-600", "text-muted-foreground"],
  ["text-slate-500", "text-muted-foreground"],
  ["text-slate-400", "text-muted-foreground"],
  ["text-slate-300", "text-muted-foreground/50"],
  ["shadow-sky-100/60", "shadow-soft"],
  ["shadow-sky-100/70", "shadow-soft"],
  ["shadow-sky-100/50", "shadow-soft"],
  ["focus-within:ring-sky-500", "focus-within:ring-ring"],
  ["focus-visible:ring-sky-500", "focus-visible:ring-ring"],
  ["bg-white/90", "bg-card/90"],
  ["bg-white/70", "bg-card/70"],
  ["bg-white/95", "bg-card/95"],
  ["hover:text-sky-700", "hover:text-primary"],
  ["bg-blue-50", "bg-primary/10"],
  ["text-blue-600", "text-primary"],
];

const files = [
  "app/dashboard/chat/page.tsx",
  "app/dashboard/documents/page.tsx",
  "app/dashboard/knowledge/page.tsx",
  "app/dashboard/settings/page.tsx",
  "components/chat/sources-panel.tsx",
  "components/markdown-renderer.tsx",
  "components/onboarding/ai-onboarding-modal.tsx",
];

for (const rel of files) {
  const filePath = path.join(root, rel);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, "utf8");
  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }
  fs.writeFileSync(filePath, content, "utf8");
  console.log("updated", rel);
}
