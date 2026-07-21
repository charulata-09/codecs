"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard, CreditCard, ShieldCheck, LogOut, Building, User } from "lucide-react";

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const links = [
    {
      name: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Billing & Plans",
      href: "/dashboard/billing",
      icon: CreditCard,
    },
  ];

  const isAdmin = session?.user?.role === "SUPER_ADMIN";

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-lg">
          S
        </div>
        <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 text-xl tracking-tight">
          SaaSify
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {link.name}
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
              pathname.startsWith("/admin")
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/10"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
            }`}
          >
            <ShieldCheck className="w-5 h-5 shrink-0" />
            Admin Panel
          </Link>
        )}
      </nav>

      {/* User Information and Log Out */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3 px-3 py-2 rounded-2xl mb-4 bg-slate-900/50 border border-slate-800/60">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center">
            <User className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-200 truncate">{session?.user?.name || "Member User"}</p>
            <p className="text-[10px] text-slate-500 truncate flex items-center gap-1 font-semibold">
              <Building className="w-3 h-3 text-slate-500 shrink-0" />
              {session?.user?.role || "MEMBER"}
            </p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-all cursor-pointer active:scale-95"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
