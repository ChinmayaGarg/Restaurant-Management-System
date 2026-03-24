"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { canDoAction } from "@/lib/access";
import { getToken } from "@/lib/auth";
import {
  closeTableSession,
  getTables,
  openTableSession,
  updateTableStatus,
} from "@/lib/tables-api";
import type { DiningTable, TableStatus } from "@/types/tables";

const TABLE_STATUSES: TableStatus[] = [
  "AVAILABLE",
  "OCCUPIED",
  "RESERVED",
  "CLEANING",
  "OUT_OF_SERVICE",
];

function getStatusClasses(status: TableStatus) {
  switch (status) {
    case "AVAILABLE":
      return "bg-green-100 text-green-700";
    case "OCCUPIED":
      return "bg-blue-100 text-blue-700";
    case "RESERVED":
      return "bg-yellow-100 text-yellow-700";
    case "CLEANING":
      return "bg-orange-100 text-orange-700";
    case "OUT_OF_SERVICE":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function TablesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [errorMessage, setErrorMessage] = useState("");
  const [openingTableId, setOpeningTableId] = useState<string | null>(null);
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
      await queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to open session",
      );
    },
  });

  const closeSessionMutation = useMutation({
    mutationFn: async (tableId: string) => closeTableSession(tableId),
    onSuccess: async () => {
      setErrorMessage("");
      await queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to close session",
      );
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (params: { tableId: string; status: TableStatus }) =>
      updateTableStatus(params.tableId, params.status),
    onSuccess: async () => {
      setErrorMessage("");
      await queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to update table status",
      );
    },
  });

  const groupedTables = useMemo(() => {
    const tables = tablesQuery.data ?? [];
    return tables.reduce<Record<string, DiningTable[]>>((acc, table) => {
      const key = table.section.name;
      if (!acc[key]) acc[key] = [];
      acc[key].push(table);
      return acc;
    }, {});
  }, [tablesQuery.data]);

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
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between rounded-2xl bg-white p-6 shadow">
          <div>
            <h1 className="text-2xl font-semibold">Tables</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage table status and dining sessions.
            </p>
          </div>

          <Link href="/dashboard" className="rounded-xl border px-4 py-2">
            Back to dashboard
          </Link>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl bg-red-50 p-4 text-red-600">
            {errorMessage}
          </div>
        ) : null}

        {tablesQuery.isLoading ? (
          <div className="rounded-2xl bg-white p-6 shadow">
            Loading tables...
          </div>
        ) : null}

        {tablesQuery.isError ? (
          <div className="rounded-2xl bg-red-50 p-6 text-red-600 shadow">
            {tablesQuery.error instanceof Error
              ? tablesQuery.error.message
              : "Failed to load tables"}
          </div>
        ) : null}

        {Object.entries(groupedTables).map(([sectionName, tables]) => (
          <section key={sectionName} className="space-y-3">
            <h2 className="text-lg font-semibold">{sectionName}</h2>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tables.map((table) => {
                const openSession = table.sessions[0] ?? null;
                const busy =
                  openSessionMutation.isPending ||
                  closeSessionMutation.isPending ||
                  updateStatusMutation.isPending;

                return (
                  <div
                    key={table.id}
                    className="rounded-2xl bg-white p-5 shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold">
                          {table.displayName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {table.tableCode}
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          Capacity: {table.capacity}
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
                          table.status,
                        )}`}
                      >
                        {table.status}
                      </span>
                    </div>

                    <div className="mt-4">
                      <label className="mb-1 block text-sm font-medium">
                        Table status
                      </label>
                      {canDoAction(user, "tables.updateStatus") ? (
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
                      <div className="mt-4 rounded-xl bg-gray-50 p-4">
                        <div className="text-sm font-medium">Open session</div>
                        <div className="mt-1 text-sm text-gray-600">
                          Guests: {openSession.guestCount ?? "N/A"}
                        </div>
                        <div className="text-sm text-gray-600">
                          Opened by: {openSession.openedByUser.firstName}{" "}
                          {openSession.openedByUser.lastName}
                        </div>
                        <div className="text-sm text-gray-600">
                          Opened at:{" "}
                          {new Date(openSession.openedAt).toLocaleString()}
                        </div>

                        {canDoAction(user, "tables.closeSession") ? (
                          <button
                            onClick={() =>
                              closeSessionMutation.mutate(table.id)
                            }
                            disabled={busy}
                            className="mt-3 w-full rounded-xl border px-4 py-2"
                          >
                            {closeSessionMutation.isPending
                              ? "Closing..."
                              : "Close session"}
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl bg-gray-50 p-4">
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
                              <button
                                onClick={() => handleOpen(table.id)}
                                disabled={busy}
                                className="flex-1 rounded-xl bg-black px-4 py-2 text-white"
                              >
                                {openSessionMutation.isPending
                                  ? "Opening..."
                                  : "Confirm"}
                              </button>

                              <button
                                onClick={() => setOpeningTableId(null)}
                                disabled={busy}
                                className="rounded-xl border px-4 py-2"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : canDoAction(user, "tables.openSession") ? (
                          <button
                            onClick={() => setOpeningTableId(table.id)}
                            disabled={busy}
                            className="w-full rounded-xl bg-black px-4 py-2 text-white"
                          >
                            Open session
                          </button>
                        ) : (
                          <div className="text-sm text-gray-500">
                            You do not have access to open sessions.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
