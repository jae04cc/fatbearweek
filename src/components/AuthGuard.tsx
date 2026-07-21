"use client";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

// This is a private pool — every page requires a logged-in user except /login.
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!isLoginPage && status === "unauthenticated") {
      router.replace("/login");
    }
  }, [isLoginPage, status, router]);

  if (isLoginPage) return <>{children}</>;

  if (status !== "authenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
