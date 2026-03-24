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
import { useAuth } from "@/providers/auth-provider";
import { canDoAction } from "@/lib/access";
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

import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ServiceRequestsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
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
        {request.status === "OPEN" &&
        canDoAction(user, "serviceRequests.acknowledge") ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => acknowledgeMutation.mutate(request.id)}
            disabled={busy}
          >
            Acknowledge
          </Button>
        ) : null}

        {request.status !== "RESOLVED" &&
        request.status !== "CANCELLED" &&
        canDoAction(user, "serviceRequests.resolve") ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => resolveMutation.mutate(request.id)}
            disabled={busy}
          >
            Resolve
          </Button>
        ) : null}

        {request.status !== "ESCALATED" &&
        request.status !== "RESOLVED" &&
        request.status !== "CANCELLED" &&
        canDoAction(user, "serviceRequests.escalate") ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => escalateMutation.mutate(request.id)}
            disabled={busy}
          >
            Escalate
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Service Requests"
          description="Manage waiter calls, bill requests, water requests, and more."
        />

        {errorMessage ? (
          <div className="rounded-2xl bg-red-50 p-4 text-red-600">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <Card>
            <CardHeader title="Create request" />
            <CardContent>
              <div className="space-y-4">
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

                {canDoAction(user, "serviceRequests.create") ? (
                  <Button
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending
                      ? "Creating..."
                      : "Create request"}
                  </Button>
                ) : (
                  <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-500">
                    You do not have permission to create service requests.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="All service requests" />
            <CardContent>
              {requestsQuery.isLoading ? (
                <div className="text-sm text-gray-600">
                  Loading service requests...
                </div>
              ) : null}

              {requestsQuery.isError ? (
                <div className="rounded-xl bg-red-50 p-4 text-red-600">
                  {requestsQuery.error instanceof Error
                    ? requestsQuery.error.message
                    : "Failed to load service requests"}
                </div>
              ) : null}

              <div className="space-y-4">
                {(requestsQuery.data ?? []).map((request) => (
                  <Card key={request.id} className="p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="font-semibold">
                            {request.tableSession.table.displayName} •{" "}
                            {request.tableSession.table.section.name}
                          </div>
                          <StatusBadge
                            label={request.status}
                            tone={
                              request.status === "OPEN"
                                ? "blue"
                                : request.status === "ACKNOWLEDGED"
                                  ? "yellow"
                                  : request.status === "RESOLVED"
                                    ? "green"
                                    : request.status === "ESCALATED"
                                      ? "red"
                                      : "gray"
                            }
                          />
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
                          Created:{" "}
                          {new Date(request.createdAt).toLocaleString()}
                        </div>
                      </div>

                      {renderActions(request)}
                    </div>
                  </Card>
                ))}

                {!requestsQuery.isLoading &&
                (requestsQuery.data ?? []).length === 0 ? (
                  <EmptyState
                    title="No service requests yet"
                    description="New requests will appear here."
                  />
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
