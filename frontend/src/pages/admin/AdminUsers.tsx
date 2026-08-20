import { ShieldCheck, UserRound } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listUsers, promoteUser } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function AdminUsers() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
  });
  const promote = useMutation({
    mutationFn: promoteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  return (
    <section className="px-5 py-8 lg:px-8">
      <div className="border-b border-mirage-border pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-mirage-cyan">
          Administration
        </p>
        <h1 className="mt-2 text-4xl font-semibold">Users</h1>
        <p className="mt-2 text-sm text-mirage-muted">
          Promote trusted Mirage accounts to administrator access.
        </p>
      </div>

      {isLoading && <p className="py-10 text-mirage-muted">Loading accounts…</p>}
      {isError && (
        <Card className="mt-8 p-6 text-sm text-mirage-orange">
          Unable to load users. Administrator access is required.
        </Card>
      )}
      <div className="mt-8 grid gap-3">
        {users.map((user) => (
          <Card key={user.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid size-11 shrink-0 place-items-center border border-mirage-border bg-white/5">
                {user.role === "admin" ? <ShieldCheck size={20} className="text-mirage-cyan" /> : <UserRound size={20} />}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{user.displayName}</p>
                <p className="truncate text-sm text-mirage-muted">{user.email}</p>
              </div>
            </div>
            <div className="sm:ml-auto">
              {user.role === "admin" ? (
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mirage-cyan">Administrator</span>
              ) : (
                <Button
                  onClick={() => promote.mutate(user.id)}
                  disabled={promote.isPending}
                >
                  <ShieldCheck size={16} /> Make admin
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      {promote.isError && <p className="mt-4 text-sm text-mirage-orange">Unable to promote that account.</p>}
    </section>
  );
}
