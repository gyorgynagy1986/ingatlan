"use client";

import { usePathname } from "next/navigation";
import { 
  Building2, 
  Home, 
  Search, 
  Plus, 
  Settings, 
  BarChart3,
  Users,
  FileText
} from "lucide-react";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const AdminNavigation = () => {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/dashboard",
      label: "Áttekintés",
      icon: Home,
      active: pathname === "/dashboard"
    },
  
    {
      href: "/dashboard/compare",
      label: "DB Összehasonlítás",
      icon: BarChart3,
      active: pathname === "/dashboard/compare"
    },
    {
      href: "/dashboard/translate",
      label: "Fordítás",
      icon: FileText,
      active: pathname === "/dashboard/translate"
    },
     {
      href: "/dashboard/database-upload",
      label: "Adatfeltöltés",
      icon: FileText,
      active: pathname === "/dashboard/database-upload"
    },
    {
      href: "/dashboard/data-extractor",
      label: "DB Készítés",
      icon: Plus,
      active: pathname === "/dashboard/data-extractor"
    },
   
  ];

  return (
    <Card className="sticky top-0 z-30 border-b">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                Ingatlan Admin Panel
              </h1>
              <p className="text-sm text-muted-foreground">
                Kezelési felület
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.href}
                  asChild
                  variant={item.active ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-9",
                    item.active && "shadow-sm"
                  )}
                >
                  <Link href={item.href}>
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </nav>

          {/* Mobile Navigation - Dropdown vagy Hamburger menü */}
          <div className="lg:hidden">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation - Horizontal scroll */}
        <nav className="lg:hidden mt-4 -mx-2">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.href}
                  asChild
                  variant={item.active ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "shrink-0 h-8 text-xs",
                    item.active && "shadow-sm"
                  )}
                >
                  <a href={item.href}>
                    <Icon className="h-3 w-3 mr-1.5" />
                    {item.label}
                  </a>
                </Button>
              );
            })}
          </div>
        </nav>
      </CardContent>
    </Card>
  );
};

export default AdminNavigation;