import ChatWorkspace from "./ChatWorkspace";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ChatWorkspace />
      {children}
    </>
  );
}
