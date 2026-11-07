import { Suspense } from "react";
import ConversationPage from "./ConversationPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          Loading conversation...
        </div>
      }
    >
      <ConversationPage />
    </Suspense>
  );
}