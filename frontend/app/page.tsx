import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePageContent />
    </Suspense>
  );
}

async function HomePageContent(): Promise<React.ReactNode> {
  const { userId } = await auth();

  if (userId) {
    redirect("/chat");
  }

  redirect("/sign-in");
}