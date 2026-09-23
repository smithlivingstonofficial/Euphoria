import { getAdminUsersPageOneCached, getCallerAuthInfo } from "@/actions/admin";
import { UsersAdminClient } from "./users-client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [data, authInfo] = await Promise.all([
    getAdminUsersPageOneCached(),
    getCallerAuthInfo(),
  ]);

  return (
    <div className="space-y-6">

      {/* Main Interactive Client */}
      <UsersAdminClient
        initialUsers={data.users || []}
        initialTotalCount={data.totalCount || 0}
        initialMetrics={data.metrics}
        currentUserRole={authInfo}
      />
    </div>
  );
}
