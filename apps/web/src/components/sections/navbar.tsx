"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Mic, Menu, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { mainNav } from "@/data/navigation";
import { siteConfig } from "@/data/site";
import { useSession } from "@/lib/auth-client";
import Logo from "@/components/logo";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Logo/>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {mainNav.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-primary after:transition-all after:duration-300"
            >
              {item.name}
            </a>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {session ? (
            <Link href="/dashboard" className="hidden sm:inline-flex">
              <Button
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/20 border-0 gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/signin" className="hidden sm:inline-flex">
                <Button variant="ghost" size="sm" className="text-sm font-medium">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup" className="hidden sm:inline-flex">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/20 border-0"
                >
                  Get Started
                </Button>
              </Link>
            </>
          )}

          {/* Mobile Menu — Sheet */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors">
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[340px] flex flex-col">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center shadow-sm">
                    <Mic className="w-3.5 h-3.5 text-white" />
                  </div>
                  {siteConfig.name}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  You speak. We listen. We understand.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col justify-between flex-1 mt-4">
                <div className="flex flex-col gap-2">
                  {mainNav.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="text-lg font-medium py-4 px-4 rounded-xl hover:bg-muted transition-colors"
                    >
                      {item.name}
                    </a>
                  ))}
                </div>
                <div className="flex flex-col gap-3 pt-6 pb-8 px-3 border-t">
                  {session ? (
                    <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                      <Button size="lg" className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 text-base gap-2">
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link href="/signin" onClick={() => setMobileOpen(false)}>
                        <Button variant="outline" size="lg" className="w-full text-base">Sign In</Button>
                      </Link>
                      <Link href="/signup" onClick={() => setMobileOpen(false)}>
                        <Button size="lg" className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 text-base">
                          Get Started
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
