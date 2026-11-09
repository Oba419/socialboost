"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Plus, Trash2, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { OptionSelect } from "@/components/forms/option-select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { OrgRole } from "@/types/database";
import { addTeamMember, createWorkspace, deleteWorkspace, removeMember, updateMemberRole } from "../actions";

export interface WorkspaceItem {
  id: string;
  name: string;
  type: string;
  role: OrgRole;
  isOwner: boolean;
  isCurrent: boolean;
}

export interface MemberItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: OrgRole;
}

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

export function WorkspacesPanel({
  workspaces,
  members,
  currentUserId,
  currentWorkspaceName,
  canManage,
  canCreateBrand,
  canCreateClient,
  canAddMembers,
  workspaceLimit,
  ownedCount,
  memberLimit,
}: {
  workspaces: WorkspaceItem[];
  members: MemberItem[];
  currentUserId: string;
  currentWorkspaceName: string;
  canManage: boolean;
  canCreateBrand: boolean;
  canCreateClient: boolean;
  canAddMembers: boolean;
  workspaceLimit: number;
  ownedCount: number;
  memberLimit: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"brand" | "client">(canCreateBrand ? "brand" : "client");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");

  const run = (fn: () => Promise<{ ok: boolean; error?: { message: string } }>, success: string, after?: () => void) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(success);
        after?.();
        router.refresh();
      } else toast.error(res.error?.message ?? "Something went wrong");
    });

  const canCreate = canCreateBrand || canCreateClient;
  const atWorkspaceLimit = ownedCount >= workspaceLimit;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1.5">
            <CardTitle>Workspaces</CardTitle>
            <CardDescription>
              Each workspace has its own brand profile, content and connected accounts. You own {ownedCount} of {workspaceLimit} allowed.
            </CardDescription>
          </div>
          {canCreate ? (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={atWorkspaceLimit}>
                  <Plus className="size-4" /> New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a workspace</DialogTitle>
                  <DialogDescription>Use brand workspaces for your own brands and client workspaces for agency clients.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Field label="Name" htmlFor="ws-name">
                    <Input id="ws-name" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={120} />
                  </Field>
                  <Field label="Type" htmlFor="ws-type">
                    <OptionSelect
                      id="ws-type"
                      value={newType}
                      onChange={(v) => setNewType(v as "brand" | "client")}
                      options={[
                        ...(canCreateBrand ? [{ value: "brand", label: "Brand" }] : []),
                        ...(canCreateClient ? [{ value: "client", label: "Client" }] : []),
                      ]}
                    />
                  </Field>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={pending || !newName.trim()}
                    onClick={() =>
                      run(() => createWorkspace({ name: newName, type: newType }), "Workspace created", () => {
                        setCreateOpen(false);
                        setNewName("");
                      })
                    }
                  >
                    {pending ? "Creating…" : "Create workspace"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Button size="sm" variant="outline" asChild>
              <a href="/dashboard/billing">
                <Lock className="size-4" /> Upgrade for more
              </a>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {workspaces.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {w.name} {w.isCurrent && <Badge variant="secondary" className="ml-1">Current</Badge>}
                  </p>
                  <p className="text-muted-foreground text-xs capitalize">
                    {w.type} · {w.role}
                  </p>
                </div>
                {w.isOwner && w.type !== "personal" && (
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="ghost" aria-label={`Delete ${w.name}`}>
                        <Trash2 className="size-4" />
                      </Button>
                    }
                    title={`Delete ${w.name}?`}
                    description="All content, scheduled posts, connected accounts and media in this workspace will be permanently deleted."
                    confirmLabel="Delete workspace"
                    destructive
                    onConfirm={() => run(() => deleteWorkspace(w.id), "Workspace deleted")}
                  />
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team · {currentWorkspaceName}</CardTitle>
          <CardDescription>
            {canAddMembers
              ? `Add people who already have an account. ${members.length} of ${memberLimit} seats used.`
              : "Team members are available on the Business and Agency plans."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManage && canAddMembers && (
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => addTeamMember({ email: inviteEmail, role: inviteRole }), "Team member added", () => setInviteEmail(""));
              }}
            >
              <Input type="email" required placeholder="teammate@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} aria-label="Teammate email" />
              <OptionSelect value={inviteRole} onChange={setInviteRole} options={ROLE_OPTIONS} className="sm:w-36" />
              <Button type="submit" disabled={pending || !inviteEmail}>
                <UserPlus className="size-4" /> Add
              </Button>
            </form>
          )}
          <ul className="divide-y">
            {members.map((m) => {
              const self = m.userId === currentUserId;
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {m.name || m.email} {self && <span className="text-muted-foreground font-normal">(you)</span>}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.role === "owner" || !canManage || self ? (
                      <Badge variant="outline" className="capitalize">{m.role}</Badge>
                    ) : (
                      <OptionSelect
                        value={m.role}
                        onChange={(r) => run(() => updateMemberRole(m.id, r), "Role updated")}
                        options={ROLE_OPTIONS}
                        className="w-28"
                      />
                    )}
                    {m.role !== "owner" && (canManage || self) && (
                      <ConfirmDialog
                        trigger={
                          <Button size="sm" variant="ghost" aria-label={self ? "Leave workspace" : `Remove ${m.email}`}>
                            <UserMinus className="size-4" />
                          </Button>
                        }
                        title={self ? "Leave this workspace?" : `Remove ${m.name || m.email}?`}
                        description={self ? "You'll lose access to its content." : "They'll lose access to this workspace immediately."}
                        confirmLabel={self ? "Leave" : "Remove"}
                        destructive
                        onConfirm={() =>
                          run(() => removeMember(m.id), self ? "You left the workspace" : "Member removed", () => {
                            if (self) router.push("/dashboard");
                          })
                        }
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
