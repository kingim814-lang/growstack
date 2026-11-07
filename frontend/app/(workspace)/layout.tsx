
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import Sidebar from "@/components/sidebar/Sidebar";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center">
          Loading workspace...
        </div>
      }
    >
      <AuthenticatedWorkspace>{children}</AuthenticatedWorkspace>
    </Suspense>
  );
}

async function AuthenticatedWorkspace({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-white dark:bg-[#212121]">
      <Suspense
        fallback={
          <aside className="w-16 shrink-0 animate-pulse bg-[#f9f9f9] dark:bg-[#171717]" />
        }
      >
        <Sidebar />
      </Suspense>

      <main className="min-w-0 min-h-0 flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
