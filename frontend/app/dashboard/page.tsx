
import { Suspense } from "react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";

import BackButton from "@/components/back-button";
import LogoutButton from "@/components/LogoutButton";

async function DashboardContent() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const email =
    user.primaryEmailAddress?.emailAddress ?? "Not available";

  const emailVerified =
    user.primaryEmailAddress?.verification?.status === "verified";

  const dateFormat = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  return (
    <main className="min-h-screen bg-white px-5 py-8 text-[#171717] dark:bg-[#212121] dark:text-[#ececec] sm:px-10">

      <div className="mx-auto max-w-3xl">

        {/* Navigation */}
        <BackButton />

        {/* Page heading */}
        <div className="mt-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            My Account
          </h1>

          <p className="mt-2 text-sm text-[#777]">
            Manage and view your account information.
          </p>
        </div>

        {/* Profile section */}
        <section className="mt-8 rounded-xl border border-[#e5e5e5] p-6 dark:border-[#383838]">

          <div className="flex flex-wrap items-center justify-between gap-5">

            <div className="flex items-center gap-4">

              <Image
                src={user.imageUrl}
                alt="User profile"
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover"
              />

              <div className="min-w-0">
                <h2 className="text-lg font-semibold">
                  {user.fullName ?? "User"}
                </h2>

                <p className="break-all text-sm text-[#777]">
                  {email}
                </p>
              </div>

            </div>

            <LogoutButton />

          </div>

        </section>

        {/* Account information */}
        <section className="mt-6 rounded-xl border border-[#e5e5e5] p-6 dark:border-[#383838]">

          <h2 className="font-semibold">
            Account Details
          </h2>

          <div className="mt-4 divide-y divide-[#e5e5e5] dark:divide-[#383838]">

            <Detail
              label="Full Name"
              value={user.fullName ?? "Not provided"}
            />

            <Detail
              label="Email Address"
              value={email}
            />

            <Detail
              label="Email Verification"
              value={emailVerified ? "Verified" : "Not verified"}
            />

            <Detail
              label="User ID"
              value={user.id}
            />

            <Detail
              label="Account Created"
              value={dateFormat.format(user.createdAt)}
            />

            <Detail
              label="Last Sign In"
              value={
                user.lastSignInAt
                  ? dateFormat.format(user.lastSignInAt)
                  : "Not available"
              }
            />

          </div>
        </section>

      </div>
    </main>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">

      <p className="text-sm text-[#777]">
        {label}
      </p>

      <p className="break-all text-sm font-medium sm:max-w-[65%] sm:text-right">
        {value}
      </p>

    </div>
  );
}

function DashboardLoading() {
  return (
    <main className="min-h-screen animate-pulse bg-white p-8 dark:bg-[#212121]">
      <div className="h-8 w-32 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-8 h-32 rounded-xl bg-gray-200 dark:bg-gray-700" />
      <div className="mt-6 h-72 rounded-xl bg-gray-200 dark:bg-gray-700" />
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
