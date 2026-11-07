
import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div>
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Create your account
          </h1>
          <p className="mt-2 text-slate-400">
            Sign up to start chatting with AI.
          </p>
        </div>

        <Suspense fallback={<p className="text-center text-white">Loading...</p>}>
          <SignUp
            path="/sign-up"
            routing="path"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/dashboard"
            appearance={{
              elements: {
                card: "bg-slate-900 border border-slate-800 shadow-xl rounded-2xl",
                headerTitle: "text-white",
                headerSubtitle: "text-slate-400",
                formFieldLabel: "text-slate-200",
                formFieldInput:
                  "bg-slate-800 border-slate-700 text-white rounded-lg",
                formButtonPrimary:
                  "bg-blue-600 hover:bg-blue-500 rounded-lg",
                socialButtonsBlockButton:
                  "bg-slate-800 border-slate-700 text-white hover:bg-slate-700",
                footerActionText: "text-slate-400",
                footerActionLink: "text-blue-400 hover:text-blue-300",
              },
            }}
          />
        </Suspense>
      </div>
    </main>
  );
}
