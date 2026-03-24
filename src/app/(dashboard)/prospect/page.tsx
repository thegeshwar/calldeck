import { Topbar } from "@/components/topbar";
import { ProspectClient } from "./prospect-client";

export default function ProspectPage() {
  return (
    <>
      <Topbar title="Prospect" subtitle="Find new businesses to call" />
      <ProspectClient />
    </>
  );
}
