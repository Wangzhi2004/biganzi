"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  PenTool,
  BookOpen,
  Users,
  Eye,
  Calendar,
  Settings,
} from "lucide-react";

interface SidebarProps {
  projectId: string;
}

const navItems = [
  {
    label: "作品驾驶舱",
    href: "",
    icon: LayoutDashboard,
  },
  {
    label: "小说编辑器",
    href: "/editor",
    icon: PenTool,
  },
  {
    label: "作品 Bible",
    href: "/bible",
    icon: BookOpen,
  },
  {
    label: "人物库",
    href: "/characters",
    icon: Users,
  },
  {
    label: "伏笔账本",
    href: "/foreshadows",
    icon: Eye,
  },
  {
    label: "章节规划",
    href: "/plan",
    icon: Calendar,
  },
  {
    label: "设置",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar({ projectId }: SidebarProps) {
  const pathname = usePathname();
  const basePath = `/project/${projectId}`;

  return (
    <aside className="w-56 border-r border-[#27272a] bg-[#0a0a0a] flex flex-col">
      <div className="p-4 border-b border-[#27272a]">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <span className="text-xs">返回首页</span>
        </Link>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map((item) => {
          const href = `${basePath}${item.href}`;
          const isActive =
            pathname === href ||
            (item.href !== "" && pathname.startsWith(href));

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200",
                isActive
                  ? "bg-white/10 text-white font-medium"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}