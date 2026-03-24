"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getTables,
  openTableSession,
  closeTableSession,
  updateTableStatus,
} from "@/lib/tables-api";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { canDoAction } from "@/lib/access";

import type { DiningTable, TableStatus } from "@/types/tables";

import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

const TABLE_STATUSES: TableStatus[] = [
  "AVAILABLE",
  "OCCUPIED",
  "RESERVED",
  "CLEANING",
  "OUT_OF_SERVICE",
];

function getTableStatusTone(status: TableStatus) {
  switch (status) {
    case "AVAILABLE":
      return "green";
    case "OCCUPIED":
      return "blue";
    case "RESERVED":
      return "yellow";
    case "CLEANING":
      return "orange";
    case "OUT_OF_SERVICE":
      return "red";
    default:
      return "gray";
  }
}

function SummaryCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: number;
  sublabel: string;
}) {
  return (
    <Card className="p-5">
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      <div className="mt-2 text-sm text-gray-600">{sublabel}</div>
    </Card>
  );
}

export default function TablesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [errorMessage, setErrorMessage] = useState("");
  const [openingTableId, setOpeningTableId] = useState<string | null>(null);
  const [confirmCloseTableId, setConfirmCloseTableId] = useState<string | null>(
    null,
  );
  const [guestCountByTable, setGuestCountByTable] = useState<
    Record<string, string>
  >({});

  const tablesQuery = useQuery({
    queryKey: ["tables"],
    queryFn: getTables,
  });

  const openSessionMutation = useMutation({
    mutationFn: async (params: { tableId: string; guestCount?: number }) =>
      openTableSession(params.tableId, params.guestCount),
    onSuccess: async () => {
      setErrorMessage("");
      setOpeningTableId(null);
      showToast({
        type: "success",
        title: "Session opened",
        message: "The table session was opened successfully.",
      });
      await queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to open session";
      setErrorMessage(message);
      showToast({
        type: "error",
        title: "Could not open session",
        message,
      });
    },
  });

  const closeSessionMutation = useMutation({
    mutationFn: async (tableId: string) => closeTableSession(tableId),
    onSuccess: async () => {
      setErrorMessage("");
      setConfirmCloseTableId(null);
      showToast({
        type: "success",
        title: "Session closed",
        message: "The table session was closed successfully.",
      });
      await queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to close session";
      setErrorMessage(message);
      showToast({
        type: "error",
        title: "Could not close session",
        message,
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (params: { tableId: string; status: TableStatus }) =>
      updateTableStatus(params.tableId, params.status),
    onSuccess: async () => {
      setErrorMessage("");
      showToast({
        type: "success",
        title: "Table updated",
        message: "The table status was updated successfully.",
      });
      await queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update table status";
      setErrorMessage(message);
      showToast({
        type: "error",
        title: "Could not update table",
        message,
      });
    },
  });

  const tables = tablesQuery.data ?? [];

  const groupedTables = useMemo(() => {
    return tables.reduce<Record<string, DiningTable[]>>((acc, table) => {
      const key = table.section.name;
      if (!acc[key]) acc[key] = [];
      acc[key].push(table);
      return acc;
    }, {});
  }, [tables]);

  const summary = useMemo(() => {
    const totalTables = tables.length;
    const openSessions = tables.filter(
      (table) => table.sessions.length > 0,
    ).length;
    const availableTables = tables.filter(
      (table) => table.status === "AVAILABLE",
    ).length;
    const occupiedTables = tables.filter(
      (table) => table.status === "OCCUPIED",
    ).length;
    const unavailableTables = tables.filter(
      (table) => table.status === "OUT_OF_SERVICE",
    ).length;

    return {
      totalTables,
      openSessions,
      availableTables,
      occupiedTables,
      unavailableTables,
    };
  }, [tables]);

  function handleOpen(tableId: string) {
    const rawValue = guestCountByTable[tableId];
    const guestCount = rawValue ? Number(rawValue) : undefined;

    openSessionMutation.mutate({
      tableId,
      guestCount,
    });
  }

  function handleStatusChange(tableId: string, status: TableStatus) {
    updateStatusMutation.mutate({ tableId, status });
  }

  return (
    <main className="space-y-6">
      <PageHeader
        title="Tables"
        description="Manage table status and dining sessions."
      />

      {errorMessage ? (
        <Card className="bg-red-50 text-red-600">{errorMessage}</Card>
      ) : null}

      {tablesQuery.isLoading ? <Card>Loading tables...</Card> : null}

      {tablesQuery.isError ? (
        <Card className="bg-red-50 text-red-600">
          {tablesQuery.error instanceof Error
            ? tablesQuery.error.message
            : "Failed to load tables"}
        </Card>
      ) : null}

      {!tablesQuery.isLoading && tables.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Tables"
            value={summary.totalTables}
            sublabel="All tables in this branch"
          />
          <SummaryCard
            label="Open Sessions"
            value={summary.openSessions}
            sublabel="Currently active dining sessions"
          />
          <SummaryCard
            label="Available Tables"
            value={summary.availableTables}
            sublabel="Ready for new guests"
          />
          <SummaryCard
            label="Occupied Tables"
            value={summary.occupiedTables}
            sublabel="Currently in use"
          />
        </div>
      ) : null}

      {!tablesQuery.isLoading && tables.length === 0 ? (
        <EmptyState
          title="No tables found"
          description="Add dining tables to start managing sessions."
        />
      ) : null}

      <div className="space-y-6">
        {Object.entries(groupedTables).map(([sectionName, sectionTables]) => (
          <section key={sectionName} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{sectionName}</h2>
              <div className="text-sm text-gray-500">
                {sectionTables.length} table
                {sectionTables.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sectionTables.map((table) => {
                const openSession = table.sessions[0] ?? null;
                const busy =
                  openSessionMutation.isPending ||
                  closeSessionMutation.isPending ||
                  updateStatusMutation.isPending;

                const canOpen = canDoAction(user, "tables.openSession");
                const canClose = canDoAction(user, "tables.closeSession");
                const canUpdateStatus = canDoAction(
                  user,
                  "tables.updateStatus",
                );

                return (
                  <Card key={table.id} className="p-5">
                    <CardHeader
                      title={table.displayName}
                      description={`${table.tableCode} • Capacity ${table.capacity}`}
                      action={
                        <StatusBadge
                          label={table.status}
                          tone={getTableStatusTone(table.status)}
                        />
                      }
                    />

                    <CardContent className="space-y-4">
                      <div>
                        <div className="mb-1 text-sm font-medium">
                          Table status
                        </div>

                        {canUpdateStatus ? (
                          <select
                            className="w-full rounded-xl border px-3 py-2"
                            value={table.status}
                            onChange={(e) =>
                              handleStatusChange(
                                table.id,
                                e.target.value as TableStatus,
                              )
                            }
                            disabled={busy}
                          >
                            {TABLE_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="rounded-xl border px-3 py-2 text-sm text-gray-600">
                            {table.status}
                          </div>
                        )}
                      </div>

                      {openSession ? (
                        <div className="rounded-xl bg-gray-50 p-4">
                          <div className="text-sm font-medium">
                            Open session
                          </div>
                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            <div>Guests: {openSession.guestCount ?? "N/A"}</div>
                            <div>
                              Opened by: {openSession.openedByUser.firstName}{" "}
                              {openSession.openedByUser.lastName}
                            </div>
                            <div>
                              Opened at:{" "}
                              {new Date(openSession.openedAt).toLocaleString()}
                            </div>
                            {openSession.assignedServer ? (
                              <div>
                                Assigned server:{" "}
                                {openSession.assignedServer.firstName}{" "}
                                {openSession.assignedServer.lastName}
                              </div>
                            ) : null}
                          </div>

                          {canClose ? (
                            <Button
                              variant="outline"
                              className="mt-3 w-full"
                              onClick={() => setConfirmCloseTableId(table.id)}
                              disabled={busy}
                            >
                              Close session
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <div className="rounded-xl bg-gray-50 p-4">
                          {openingTableId === table.id ? (
                            <div className="space-y-3">
                              <div>
                                <label className="mb-1 block text-sm font-medium">
                                  Guest count
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  className="w-full rounded-xl border px-3 py-2"
                                  value={guestCountByTable[table.id] ?? ""}
                                  onChange={(e) =>
                                    setGuestCountByTable((prev) => ({
                                      ...prev,
                                      [table.id]: e.target.value,
                                    }))
                                  }
                                />
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  className="flex-1"
                                  onClick={() => handleOpen(table.id)}
                                  disabled={busy}
                                >
                                  {openSessionMutation.isPending
                                    ? "Opening..."
                                    : "Confirm"}
                                </Button>

                                <Button
                                  variant="outline"
                                  onClick={() => setOpeningTableId(null)}
                                  disabled={busy}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : canOpen ? (
                            <Button
                              className="w-full"
                              onClick={() => setOpeningTableId(table.id)}
                              disabled={busy}
                            >
                              Open session
                            </Button>
                          ) : (
                            <div className="text-sm text-gray-500">
                              You do not have access to open sessions.
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(confirmCloseTableId)}
        title="Close table session?"
        message="This will close the active dining session for this table."
        confirmLabel="Close session"
        loading={closeSessionMutation.isPending}
        onCancel={() => setConfirmCloseTableId(null)}
        onConfirm={() => {
          if (confirmCloseTableId) {
            closeSessionMutation.mutate(confirmCloseTableId);
          }
        }}
      />
    </main>
  );
}
