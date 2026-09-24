import { getHelpdeskOperatorsAction, getHelpdeskAuthInfo } from "@/actions/helpdesk";
import { redirect } from "next/navigation";
import { HelpdeskManagementClient } from "./helpdesk-management-client";

export const dynamic = "force-dynamic";

export default async function AdminHelpdeskPage() {
  const auth = await getHelpdeskAuthInfo();

  if (!auth || !auth.isAdmin) {
    redirect("/admin");
  }

  const res = await getHelpdeskOperatorsAction();
  const operators = res.operators || [];

  return (
    <div className="space-y-6">
      <HelpdeskManagementClient initialOperators={operators} isSuperAdmin={auth.isSuperAdmin} />
    </div>
  );
}
