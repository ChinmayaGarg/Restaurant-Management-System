"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  acknowledgeServiceRequest,
  createServiceRequest,
  escalateServiceRequest,
  getServiceRequests,
  resolveServiceRequest,
} from "@/lib/service-requests-api";
import { getTables } from "@/lib/tables-api";

import type {
  ServiceRequest,
  ServiceRequestSourceType,
  ServiceRequestStatus,
  ServiceRequestType,
} from "@/types/service-requests";
import type { DiningTable } from "@/types/tables";

const REQUEST_TYPES: ServiceRequestType[] = [
  "CALL_SERVER",
  "REQUEST_BILL",
  "WATER",
  "CLEANING",
  "HELP",
  "READY_TO_ORDER",
];

const SOURCE_TYPES: ServiceRequestSourceType[] = [
  "STAFF",
  "QR",
  "BUTTON",
  "SYSTEM",
];

function getStatusClasses(status: ServiceRequestStatus) {
  switch (status) {
    case "OPEN":
      return "bg-blue-100 text-blue-700";
    case "ACKNOWLEDGED":
      return "bg-yellow-100 text-yellow-700";
    case "RESOLVED":
      return "bg-green-100 text-green-700";
    case "ESCALATED":
      return "bg-red-100 text-red-700";
    case "CANCELLED":
      return "bg-gray-200 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function ServiceRequestsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [errorMessage, setErrorMessage] = useState("");
  const [tableSessionId, setTableSessionId] = useState("");
  const [requestType, setRequestType] =
    useState<ServiceRequestType>("CALL_SERVER");
  const [sourceType, setSourceType] =
    useState<ServiceRequestSourceType>("STAFF");
  const [sourceDeviceId, setSourceDeviceId] = useState("");

  const requestsQuery = useQuery({
    queryKey: ["service-requests"],
    queryFn: getServiceRequests,
  });

  const tablesQuery = useQuery({
    queryKey: ["tables"],
    queryFn: getTables,
  });

  const createMutation = useMutation({
    mutationFn: createServiceRequest,
    onSuccess: async () => {
      setErrorMessage("");
      setTableSessionId("");
      setRequestType("CALL_SERVER");
      setSourceType("STAFF");
      setSourceDeviceId("");
      await queryClient.invalidateQueries({ queryKey: ["service-requests"] });
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to create service request",
      );
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: acknowledgeServiceRequest,
    onSuccess: async () => {
      setErrorMessage("");
      await queryClient.invalidateQueries({ queryKey: ["service-requests"] });
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to acknowledge request",
      );
    },
  });

  const resolveMutation = useMutation({
    mutationFn: resolveServiceRequest,
    onSuccess: async () => {
      setErrorMessage("");
      await queryClient.invalidateQueries({ queryKey: ["service-requests"] });
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to resolve request",
      );
    },
  });

  const escalateMutation = useMutation({
    mutationFn: escalateServiceRequest,
    onSuccess: async () => {
      setErrorMessage("");
      await queryClient.invalidateQueries({ queryKey: ["service-requests"] });
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to escalate request",
      );
    },
  });

  const openSessions = useMemo(() => {
    const tables = tablesQuery.data ?? [];
    return tables.flatMap((table: DiningTable) =>
      table.sessions.map((session) => ({
        sessionId: session.id,
        tableName: table.displayName,
        tableCode: table.tableCode,
        sectionName: table.section.name,
        guestCount: session.guestCount,
      })),
    );
  }, [tablesQuery.data]);

  function handleCreate() {
    if (!tableSessionId) {
      setErrorMessage("Please choose an open table session");
      return;
    }

    createMutation.mutate({
      tableSessionId,
      requestType,
      sourceType,
      sourceDeviceId: sourceDeviceId || undefined,
    });
  }

  function renderActions(request: ServiceRequest) {
    const busy =
      acknowledgeMutation.isPending ||
      resolveMutation.isPending ||
      escalateMutation.isPending;

    return (
      <div className="flex flex-wrap gap-2">
        {request.status === "OPEN" ? (
          <button
            onClick={() => acknowledgeMutation.mutate(request.id)}
            disabled={busy}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            Acknowledge
          </button>
        ) : null}

        {request.status !== "RESOLVED" && request.status !== "CANCELLED" ? (
          <button
            onClick={() => resolveMutation.mutate(request.id)}
            disabled={busy}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            Resolve
          </button>
        ) : null}

        {request.status !== "ESCALATED" &&
        request.status !== "RESOLVED" &&
        request.status !== "CANCELLED" ? (
          <button
            onClick={() => escalateMutation.mutate(request.id)}
            disabled={busy}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            Escalate
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between rounded-2xl bg-white p-6 shadow">
          <div>
            <h1 className="text-2xl font-semibold">Service Requests</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage waiter calls, bill requests, water requests, and more.
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

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-lg font-semibold">Create request</h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Open table session
                </label>
                <select
                  className="w-full rounded-xl border px-3 py-2"
                  value={tableSessionId}
                  onChange={(e) => setTableSessionId(e.target.value)}
                >
                  <option value="">Select a table session</option>
                  {openSessions.map((session) => (
                    <option key={session.sessionId} value={session.sessionId}>
                      {session.tableName} ({session.tableCode}) •{" "}
                      {session.sectionName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Request type
                </label>
                <select
                  className="w-full rounded-xl border px-3 py-2"
                  value={requestType}
                  onChange={(e) =>
                    setRequestType(e.target.value as ServiceRequestType)
                  }
                >
                  {REQUEST_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Source type
                </label>
                <select
                  className="w-full rounded-xl border px-3 py-2"
                  value={sourceType}
                  onChange={(e) =>
                    setSourceType(e.target.value as ServiceRequestSourceType)
                  }
                >
                  {SOURCE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Source device ID
                </label>
                <input
                  className="w-full rounded-xl border px-3 py-2"
                  value={sourceDeviceId}
                  onChange={(e) => setSourceDeviceId(e.target.value)}
                  placeholder="Optional device identifier"
                />
              </div>

              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="w-full rounded-xl bg-black px-4 py-2 text-white disabled:opacity-60"
              >
                {createMutation.isPending ? "Creating..." : "Create request"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-lg font-semibold">All service requests</h2>

            {requestsQuery.isLoading ? (
              <div className="mt-4 text-sm text-gray-600">
                Loading service requests...
              </div>
            ) : null}

            {requestsQuery.isError ? (
              <div className="mt-4 rounded-xl bg-red-50 p-4 text-red-600">
                {requestsQuery.error instanceof Error
                  ? requestsQuery.error.message
                  : "Failed to load service requests"}
              </div>
            ) : null}

            <div className="mt-4 space-y-4">
              {(requestsQuery.data ?? []).map((request) => (
                <div key={request.id} className="rounded-2xl border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="font-semibold">
                          {request.tableSession.table.displayName} •{" "}
                          {request.tableSession.table.section.name}
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
                            request.status,
                          )}`}
                        >
                          {request.status}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600">
                        Request: {request.requestType}
                      </div>

                      <div className="text-sm text-gray-600">
                        Source: {request.sourceType}
                      </div>

                      {request.createdByUser ? (
                        <div className="text-sm text-gray-600">
                          Created by: {request.createdByUser.firstName}{" "}
                          {request.createdByUser.lastName}
                        </div>
                      ) : null}

                      {request.assignedToUser ? (
                        <div className="text-sm text-gray-600">
                          Assigned to: {request.assignedToUser.firstName}{" "}
                          {request.assignedToUser.lastName}
                        </div>
                      ) : null}

                      <div className="text-xs text-gray-500">
                        Created: {new Date(request.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {renderActions(request)}
                  </div>
                </div>
              ))}

              {!requestsQuery.isLoading &&
              (requestsQuery.data ?? []).length === 0 ? (
                <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600">
                  No service requests yet.
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
