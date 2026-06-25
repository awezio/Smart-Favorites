import { cn } from "@/lib/utils";

interface EditorialSectionProps {
  id?: string;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
  bordered?: boolean;
}

export function EditorialSection({
  id,
  title,
  subtitle,
  children,
  className,
  narrow = false,
  bordered = true,
}: EditorialSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        bordered && "border-b border-border",
        "py-12 sm:py-16",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto px-4 sm:px-6",
          narrow ? "max-w-3xl" : "max-w-5xl"
        )}
      >
        {(title || subtitle) && (
          <header className="mb-8 sm:mb-10">
            {title && <h2 className="type-h2">{title}</h2>}
            {subtitle && (
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            )}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}

interface ContentListProps {
  children: React.ReactNode;
  className?: string;
}

export function ContentList({ children, className }: ContentListProps) {
  return (
    <ul className={cn("divide-y divide-border border border-border", className)}>
      {children}
    </ul>
  );
}

interface ContentListItemProps {
  href?: string;
  meta?: string;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ContentListItem({
  href,
  meta,
  title,
  description,
  trailing,
  className,
  onClick,
}: ContentListItemProps) {
  const inner = (
    <>
      <div className="min-w-0 flex-1 space-y-1">
        {meta && (
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {meta}
          </p>
        )}
        <h3 className="font-serif text-lg font-semibold leading-snug text-foreground sm:text-xl">
          {title}
        </h3>
        {description && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {trailing && (
        <div className="shrink-0 self-start text-sm text-muted-foreground">
          {trailing}
        </div>
      )}
    </>
  );

  const itemClass = cn(
    "flex gap-4 px-4 py-5 transition-colors hover:bg-muted/40 sm:px-6 sm:py-6",
    className
  );

  if (href) {
    return (
      <li>
        <a href={href} className={cn(itemClass, "block")}>
          {inner}
        </a>
      </li>
    );
  }

  return (
    <li>
      <div
        className={cn(itemClass, onClick && "cursor-pointer")}
        onClick={onClick}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") onClick();
              }
            : undefined
        }
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {inner}
      </div>
    </li>
  );
}
