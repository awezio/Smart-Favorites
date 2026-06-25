"use client";

import type { ReactNode, KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
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
  onSearchKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
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
  onSearchKeyDown,
}: FilterToolbarProps) {
  return (
    <div
      className={cn(
        "border border-border bg-background p-3",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {showSelectAll && onToggleSelectAll && (
          <div className="flex items-center gap-2 border border-border bg-background px-3 py-2">
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
            onKeyDown={onSearchKeyDown}
            className="h-10 border-border bg-background pl-9 focus-visible:ring-1"
          />
        </div>

        {selects.map((select) => (
          <select
            key={select.id}
            value={select.value}
            onChange={(event) => select.onChange(event.target.value)}
            className={cn(
              "h-10 border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/40",
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
          <div className="ml-auto flex overflow-hidden border border-border bg-background">
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
  modes: Array<{ id: string; icon: LucideIcon }>;
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

export function ItemGrid({
  children,
  className,
  columns = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
}: {
  children: ReactNode;
  className?: string;
  columns?: string;
}) {
  return (
    <div
      className={cn(
        "grid divide-x divide-y divide-border border border-border bg-card",
        columns,
        className
      )}
    >
      {children}
    </div>
  );
}

export function ItemSurface({
  selected = false,
  inset = false,
  className,
  children,
}: {
  selected?: boolean;
  inset?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-card transition-colors hover:bg-muted/30",
        !inset && "border border-border",
        inset && selected && "border-l-2 border-l-primary bg-primary/[0.03]",
        !inset &&
          selected &&
          "border-primary/50 bg-primary/[0.03] ring-1 ring-primary/20",
        className
      )}
    >
      {children}
    </div>
  );
}
