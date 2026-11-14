import { AppShell } from "@/components/shell/AppShell";
import { FieldWorkspace } from "@/components/tarla/FieldWorkspace";

export default function Home() {
  return (
    <AppShell full>
      <FieldWorkspace />
    </AppShell>
  );
}
