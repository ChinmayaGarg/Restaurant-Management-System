"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getTables } from "@/lib/tables-api";
import {
  acknowledgeServiceRequest,
  createServiceRequest,
  escalateServiceRequest,
  getServiceRequests,
  resolveServiceRequest,
} from "@/lib/service-requests-api";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { canDoAction } from "@/lib/access";

import type { DiningTable } from "@/types/tables";
import type {
  ServiceRequest,
  ServiceRequestSourceType,
  ServiceRequestStatus,
  ServiceRequestType,
} from "@/types/service-requests";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

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

function getRequestStatusTone(status: ServiceRequestStatus) {
  switch (status) {
    case "OPEN":
      return "blue";
    case "ACKNOWLEDGED":
      return "yellow";
    case "RESOLVED":
      return "green";
    case "ESCALATED":
      return "red";
    case "CANCELLED":
      return "gray";
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

export default function ServiceRequestsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

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

      showToast({
        type: "success",
        title: "Request created",
        message: "The service request was created successfully.",
      });

      await queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create service request";
      setErrorMessage(message);
      showToast({
        type: "error",
        title: "Could not create request",
        message,
      });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: acknowledgeServiceRequest,
    onSuccess: async () => {
      setErrorMessage("");
      showToast({
        type: "success",
        title: "Request acknowledged",
        message: "The service request was acknowledged successfully.",
      });
      await queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to acknowledge request";
      setErrorMessage(message);
      showToast({
        type: "error",
        title: "Could not acknowledge request",
        message,
      });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: resolveServiceRequest,
    onSuccess: async () => {
      setErrorMessage("");
      showToast({
        type: "success",
        title: "Request resolved",
        message: "The service request was resolved successfully.",
      });
      await queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to resolve request";
      setErrorMessage(message);
      showToast({
        type: "error",
        title: "Could not resolve request",
        message,
      });
    },
  });

  const escalateMutation = useMutation({
    mutationFn: escalateServiceRequest,
    onSuccess: async () => {
      setErrorMessage("");
      showToast({
        type: "success",
        title: "Request escalated",
        message: "The service request was escalated successfully.",
      });
      await queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to escalate request";
      setErrorMessage(message);
      showToast({
        type: "error",
        title: "Could not escalate request",
        message,
      });
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

  const requests = requestsQuery.data ?? [];

  const summary = useMemo(() => {
    return {
      totalRequests: requests.length,
      openRequests: requests.filter((request) => request.status === "OPEN")
        .length,
      acknowledgedRequests: requests.filter(
        (request) => request.status === "ACKNOWLEDGED",
      ).length,
      escalatedRequests: requests.filter(
        (request) => request.status === "ESCALATED",
      ).length,
      resolvedRequests: requests.filter(
        (request) => request.status === "RESOLVED",
      ).length,
    };
  }, [requests]);

  function handleCreate() {
    if (!tableSessionId) {
      setErrorMessage("Please choose an open table session");
      showToast({
        type: "error",
        title: "Missing information",
        message: "Please choose an open table session.",
      });
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
    <main className="space-y-6">
      <PageHeader
        title="Service Requests"
        description="Manage waiter calls, bill requests, water requests, and more."
      />

      {errorMessage ? (
        <Card className="bg-red-50 text-red-600">{errorMessage}</Card>
      ) : null}

      {requestsQuery.isLoading || tablesQuery.isLoading ? (
        <Card>Loading service requests...</Card>
      ) : null}

      {requestsQuery.isError || tablesQuery.isError ? (
        <Card className="bg-red-50 text-red-600">
          {requestsQuery.error instanceof Error
            ? requestsQuery.error.message
            : tablesQuery.error instanceof Error
              ? tablesQuery.error.message
              : "Failed to load service request data"}
        </Card>
      ) : null}

      {!requestsQuery.isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Total Requests"
            value={summary.totalRequests}
            sublabel="All requests currently loaded"
          />
          <SummaryCard
            label="Open"
            value={summary.openRequests}
            sublabel="Still waiting for response"
          />
          <SummaryCard
            label="Acknowledged"
            value={summary.acknowledgedRequests}
            sublabel="Seen and being handled"
          />
          <SummaryCard
            label="Escalated"
            value={summary.escalatedRequests}
            sublabel="Needs higher attention"
          />
          <SummaryCard
            label="Resolved"
            value={summary.resolvedRequests}
            sublabel="Completed requests"
          />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader
            title="Create request"
            description="Choose an open table session and request type."
          />

          <CardContent className="space-y-4">
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
                className="w-full"
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create request"}
              </Button>
            ) : (
              <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-500">
                You do not have permission to create service requests.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="All service requests"
            description="Track and manage active floor-side requests."
          />

          <CardContent className="space-y-4">
            {requests.length === 0 && !requestsQuery.isLoading ? (
              <EmptyState
                title="No service requests yet"
                description="Create a request from the left panel to get started."
              />
            ) : null}

            {requests.map((request) => (
              <Card key={request.id} className="border p-4 shadow-none">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold">
                        {request.tableSession.table.displayName} •{" "}
                        {request.tableSession.table.section.name}
                      </div>

                      <StatusBadge
                        label={request.status}
                        tone={getRequestStatusTone(request.status)}
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

                    {request.sourceDeviceId ? (
                      <div className="text-sm text-gray-600">
                        Device: {request.sourceDeviceId}
                      </div>
                    ) : null}

                    <div className="text-xs text-gray-500">
                      Created: {new Date(request.createdAt).toLocaleString()}
                    </div>

                    {request.acknowledgedAt ? (
                      <div className="text-xs text-gray-500">
                        Acknowledged:{" "}
                        {new Date(request.acknowledgedAt).toLocaleString()}
                      </div>
                    ) : null}

                    {request.resolvedAt ? (
                      <div className="text-xs text-gray-500">
                        Resolved:{" "}
                        {new Date(request.resolvedAt).toLocaleString()}
                      </div>
                    ) : null}
                  </div>

                  {renderActions(request)}
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
