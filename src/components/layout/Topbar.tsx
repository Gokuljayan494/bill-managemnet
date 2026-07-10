"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { NotificationsMenu } from "@/components/layout/NotificationsMenu";
import { ProfileMenu } from "@/components/layout/ProfileMenu";

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-slate-200 bg-white/90 px-6 backdrop-blur">
      <GlobalSearch />

      <div className="ml-auto flex items-center gap-2">
        <Link href="/invoices/new">
          <Button size="sm">
            <Plus size={15} />
            New Invoice
          </Button>
        </Link>
        <NotificationsMenu />
        <ProfileMenu />
      </div>
    </header>
  );
}
