"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FilterSelectOption = {
  value: string;
  label: string;
};

type FilterSelect = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
  className?: string;
};

type FilterToolbarProps = {
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  selects?: FilterSelect[];
  showSelectAll?: boolean;
  allSelected?: boolean;
  onToggleSelectAll?: () => void;
  selectedCount?: number;
  actions?: ReactNode;
  viewToggle?: ReactNode;
  className?: string;
};

export function FilterToolbar({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  selects = [],
  showSelectAll = false,
  allSelected = false,
  onToggleSelectAll,
  selectedCount = 0,
  actions,
  viewToggle,
  className,
}: FilterToolbarProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-muted/10 p-3 shadow-sm backdrop-blur-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {showSelectAll && onToggleSelectAll && (
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/70 px-3 py-2">
            <Checkbox
              checked={allSelected}
              onChange={onToggleSelectAll}
              aria-label="全选当前筛选结果"
            />
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              {selectedCount > 0 ? `已选 ${selectedCount}` : "全选"}
            </span>
          </div>
        )}

        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-10 rounded-xl border-border/60 bg-background/80 pl-9 shadow-none focus-visible:ring-1"
          />
        </div>

        {selects.map((select) => (
          <select
            key={select.id}
            value={select.value}
            onChange={(event) => select.onChange(event.target.value)}
            className={cn(
              "h-10 rounded-xl border border-border/60 bg-background/80 px-3 text-sm text-foreground shadow-none outline-none transition-colors focus:border-primary/40",
              select.className
            )}
          >
            {select.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ))}

        {actions}

        {viewToggle && (
          <div className="ml-auto flex overflow-hidden rounded-xl border border-border/60 bg-background/70">
            {viewToggle}
          </div>
        )}
      </div>
    </div>
  );
}

export function ViewModeToggle({
  modes,
  active,
  onChange,
}: {
  modes: Array<{ id: string; icon: React.ComponentType<{ className?: string }> }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <>
      {modes.map(({ id, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "p-2.5 transition-colors duration-200",
            active === id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
          aria-label={id}
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </button>
      ))}
    </>
  );
}

export function ItemSurface({
  selected = false,
  className,
  children,
}: {
  selected?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card/90 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md",
        selected && "border-primary/50 bg-primary/[0.03] ring-1 ring-primary/20",
        className
      )}
    >
      {children}
    </div>
  );
}
