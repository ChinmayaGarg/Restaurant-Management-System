"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { canDoAction } from "@/lib/access";
import {
  getKitchenQueue,
  updateKitchenItemAvailability,
  updateKitchenOrderStatus,
} from "@/lib/kitchen-api";
import type { Order, OrderItem, OrderStatus } from "@/types/orders";

const KITCHEN_STATUSES: OrderStatus[] = ["ACCEPTED", "PREPARING", "READY"];

import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/providers/toast-provider";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function KitchenPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [errorMessage, setErrorMessage] = useState("");
  const { user } = useAuth();
  const queueQuery = useQuery({
    queryKey: ["kitchen-queue"],
    queryFn: getKitchenQueue,
    refetchInterval: 10000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (params: { orderId: string; status: OrderStatus }) =>
      updateKitchenOrderStatus(params.orderId, params.status),
    onSuccess: async () => {
      setErrorMessage("");
      await queryClient.invalidateQueries({ queryKey: ["kitchen-queue"] });
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to update kitchen status",
      );
    },
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: async (params: { itemId: string; isAvailable: boolean }) =>
      updateKitchenItemAvailability(params.itemId, params.isAvailable),
    onSuccess: async () => {
      setErrorMessage("");
      await queryClient.invalidateQueries({ queryKey: ["kitchen-queue"] });
      await queryClient.invalidateQueries({ queryKey: ["menu"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to update item availability",
      );
    },
  });

  const groupedOrders = useMemo(() => {
    const orders = queueQuery.data ?? [];
    return {
      PLACED: orders.filter((o) => o.status === "PLACED"),
      ACCEPTED: orders.filter((o) => o.status === "ACCEPTED"),
      PREPARING: orders.filter((o) => o.status === "PREPARING"),
      READY: orders.filter((o) => o.status === "READY"),
    };
  }, [queueQuery.data]);

  function renderItem(item: OrderItem) {
    const busy = updateAvailabilityMutation.isPending;

    return (
      <div key={item.id} className="rounded-xl bg-gray-50 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium">
              {item.menuItem.name} × {item.quantity}
            </div>
            <div className="text-sm text-gray-500">
              Item status: {item.status}
            </div>
            {item.specialInstructions ? (
              <div className="text-sm text-gray-600">
                Instructions: {item.specialInstructions}
              </div>
            ) : null}
            {item.modifiers.length > 0 ? (
              <div className="mt-1 text-sm text-gray-600">
                Modifiers:{" "}
                {item.modifiers.map((m) => m.modifierOption.name).join(", ")}
              </div>
            ) : null}
          </div>

          {canDoAction(user, "kitchen.updateItemAvailability") ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                updateAvailabilityMutation.mutate({
                  itemId: item.menuItem.id,
                  isAvailable: false,
                })
              }
              disabled={busy}
            >
              Mark unavailable
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  function renderOrderCard(order: Order) {
    const busy = updateStatusMutation.isPending;

    return (
      <Card key={order.id}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-semibold">
                {order.tableSession.table.displayName} •{" "}
                {order.tableSession.table.section.name}
              </h3>
              <StatusBadge
                label={order.status}
                tone={
                  order.status === "PLACED"
                    ? "gray"
                    : order.status === "ACCEPTED"
                      ? "blue"
                      : order.status === "PREPARING"
                        ? "yellow"
                        : order.status === "READY"
                          ? "green"
                          : "gray"
                }
              />
            </div>
            <div className="mt-1 text-sm text-gray-500">
              Order ID: {order.id}
            </div>
            <div className="text-sm text-gray-500">
              Created: {new Date(order.createdAt).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">
              Source: {order.sourceType}
            </div>
          </div>

          <div className="w-full md:w-56">
            <label className="mb-1 block text-sm font-medium">
              Kitchen status
            </label>
            {canDoAction(user, "kitchen.updateStatus") ? (
              <select
                className="w-full rounded-xl border px-3 py-2"
                value={order.status}
                onChange={(e) =>
                  updateStatusMutation.mutate({
                    orderId: order.id,
                    status: e.target.value as OrderStatus,
                  })
                }
                disabled={busy}
              >
                {KITCHEN_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-xl border px-3 py-2 text-sm text-gray-600">
                {order.status}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2">{order.items.map(renderItem)}</div>
      </Card>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Kitchen"
          description="Manage kitchen queue, advance order prep, and control item availability."
        />

        {errorMessage ? (
          <div className="rounded-2xl bg-red-50 p-4 text-red-600">
            {errorMessage}
          </div>
        ) : null}

        {queueQuery.isLoading ? (
          <div className="rounded-2xl bg-white p-6 shadow">
            Loading kitchen queue...
          </div>
        ) : null}

        {queueQuery.isError ? (
          <div className="rounded-2xl bg-red-50 p-6 text-red-600 shadow">
            {queueQuery.error instanceof Error
              ? queueQuery.error.message
              : "Failed to load kitchen queue"}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          {(["PLACED", "ACCEPTED", "PREPARING", "READY"] as const).map(
            (bucket) => (
              <Card key={bucket}>
                <CardHeader title={bucket} />
                <CardContent>
                  <div className="space-y-4">
                    {groupedOrders[bucket].map(renderOrderCard)}
                    {!queueQuery.isLoading &&
                    groupedOrders[bucket].length === 0 ? (
                      <EmptyState
                        title={`No ${bucket.toLowerCase()} orders`}
                        description="Orders will appear here when available."
                      />
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ),
          )}
        </div>
      </div>
    </main>
  );
}
