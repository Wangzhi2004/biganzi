"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AIResultCardProps {
  icon?: ReactNode;
  title: string;
  badge?: string;
  badgeClassName?: string;
  timestamp?: string;
  children: ReactNode;
  className?: string;
}

export function AIResultCard({
  icon,
  title,
  badge,
  badgeClassName,
  timestamp,
  children,
  className,
}: AIResultCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-800/60 bg-zinc-950/40 overflow-hidden",
        className
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/40">
        {icon && <span className="text-zinc-500">{icon}</span>}
        <span className="text-xs font-medium text-zinc-300">{title}</span>
        {badge && (
          <span
            className={cn(
              "ml-auto text-[10px] px-1.5 py-0.5 rounded border",
              badgeClassName || "border-zinc-700 bg-zinc-800/50 text-zinc-500"
            )}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="p-3">{children}</div>
      {timestamp && (
        <div className="px-3 py-1.5 border-t border-zinc-800/40 text-[10px] text-zinc-600 text-right">
          {timestamp}
        </div>
      )}
    </div>
  );
}
