"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getKitchenQueue,
  updateKitchenItemAvailability,
  updateKitchenOrderStatus,
} from "@/lib/kitchen-api";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { canDoAction } from "@/lib/access";

import type { Order, OrderItem, OrderStatus } from "@/types/orders";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

const KITCHEN_STATUSES: OrderStatus[] = ["ACCEPTED", "PREPARING", "READY"];

function getOrderStatusTone(status: OrderStatus) {
  switch (status) {
    case "PLACED":
      return "gray";
    case "ACCEPTED":
      return "blue";
    case "PREPARING":
      return "yellow";
    case "READY":
      return "green";
    case "SERVED":
      return "emerald";
    case "CANCELLED":
      return "red";
    case "CLOSED":
      return "purple";
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

function QueueColumn({
  title,
  orders,
  renderOrderCard,
}: {
  title: string;
  orders: Order[];
  renderOrderCard: (order: Order) => React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="text-sm text-gray-500">
          {orders.length} order{orders.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <EmptyState
            title={`No ${title.toLowerCase()} orders`}
            description={`Orders in ${title.toLowerCase()} state will appear here.`}
          />
        ) : (
          orders.map(renderOrderCard)
        )}
      </div>
    </section>
  );
}

export default function KitchenPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [errorMessage, setErrorMessage] = useState("");

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
      showToast({
        type: "success",
        title: "Kitchen status updated",
        message: "The order status was updated successfully.",
      });
      await queryClient.invalidateQueries({ queryKey: ["kitchen-queue"] });
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update kitchen status";
      setErrorMessage(message);
      showToast({
        type: "error",
        title: "Could not update kitchen status",
        message,
      });
    },
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: async (params: { itemId: string; isAvailable: boolean }) =>
      updateKitchenItemAvailability(params.itemId, params.isAvailable),
    onSuccess: async (_, variables) => {
      setErrorMessage("");
      showToast({
        type: "success",
        title: variables.isAvailable ? "Item available" : "Item unavailable",
        message: `The menu item was marked as ${
          variables.isAvailable ? "available" : "unavailable"
        }.`,
      });
      await queryClient.invalidateQueries({ queryKey: ["kitchen-queue"] });
      await queryClient.invalidateQueries({ queryKey: ["menu"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update item availability";
      setErrorMessage(message);
      showToast({
        type: "error",
        title: "Could not update item",
        message,
      });
    },
  });

  const orders = queueQuery.data ?? [];

  const groupedOrders = useMemo(() => {
    return {
      PLACED: orders.filter((order) => order.status === "PLACED"),
      ACCEPTED: orders.filter((order) => order.status === "ACCEPTED"),
      PREPARING: orders.filter((order) => order.status === "PREPARING"),
      READY: orders.filter((order) => order.status === "READY"),
    };
  }, [orders]);

  const summary = useMemo(() => {
    return {
      totalQueue: orders.length,
      placed: groupedOrders.PLACED.length,
      preparing: groupedOrders.PREPARING.length,
      ready: groupedOrders.READY.length,
    };
  }, [orders, groupedOrders]);

  const canUpdateKitchenStatus = canDoAction(user, "kitchen.updateStatus");
  const canUpdateItemAvailability = canDoAction(
    user,
    "kitchen.updateItemAvailability",
  );

  function renderItem(item: OrderItem) {
    const busy = updateAvailabilityMutation.isPending;

    return (
      <Card key={item.id} className="border bg-gray-50 p-3 shadow-none">
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

          {canUpdateItemAvailability ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
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

              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  updateAvailabilityMutation.mutate({
                    itemId: item.menuItem.id,
                    isAvailable: true,
                  })
                }
                disabled={busy}
              >
                Mark available
              </Button>
            </div>
          ) : null}
        </div>
      </Card>
    );
  }

  function renderOrderCard(order: Order) {
    const busy = updateStatusMutation.isPending;

    return (
      <Card key={order.id}>
        <CardHeader
          title={`${order.tableSession.table.displayName} • ${order.tableSession.table.section.name}`}
          description={`Order ID: ${order.id} • Source: ${order.sourceType}`}
          action={
            <StatusBadge
              label={order.status}
              tone={getOrderStatusTone(order.status)}
            />
          }
        />

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1 text-sm text-gray-500">
              <div>Created: {new Date(order.createdAt).toLocaleString()}</div>
              {order.notes ? <div>Notes: {order.notes}</div> : null}
            </div>

            <div className="w-full md:w-56">
              <label className="mb-1 block text-sm font-medium">
                Kitchen status
              </label>

              {canUpdateKitchenStatus ? (
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

          <div className="space-y-2">{order.items.map(renderItem)}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <main className="space-y-6">
      <PageHeader
        title="Kitchen"
        description="Manage kitchen queue, advance order prep, and control item availability."
      />

      {errorMessage ? (
        <Card className="bg-red-50 text-red-600">{errorMessage}</Card>
      ) : null}

      {queueQuery.isLoading ? <Card>Loading kitchen queue...</Card> : null}

      {queueQuery.isError ? (
        <Card className="bg-red-50 text-red-600">
          {queueQuery.error instanceof Error
            ? queueQuery.error.message
            : "Failed to load kitchen queue"}
        </Card>
      ) : null}

      {!queueQuery.isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Queue Total"
            value={summary.totalQueue}
            sublabel="Orders currently in kitchen workflow"
          />
          <SummaryCard
            label="Placed"
            value={summary.placed}
            sublabel="Newly placed orders"
          />
          <SummaryCard
            label="Preparing"
            value={summary.preparing}
            sublabel="Orders being prepared"
          />
          <SummaryCard
            label="Ready"
            value={summary.ready}
            sublabel="Orders ready for service"
          />
        </div>
      )}

      {!queueQuery.isLoading && orders.length === 0 ? (
        <EmptyState
          title="No kitchen orders"
          description="Orders moving through the kitchen workflow will appear here."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <QueueColumn
            title="PLACED"
            orders={groupedOrders.PLACED}
            renderOrderCard={renderOrderCard}
          />
          <QueueColumn
            title="ACCEPTED"
            orders={groupedOrders.ACCEPTED}
            renderOrderCard={renderOrderCard}
          />
          <QueueColumn
            title="PREPARING"
            orders={groupedOrders.PREPARING}
            renderOrderCard={renderOrderCard}
          />
          <QueueColumn
            title="READY"
            orders={groupedOrders.READY}
            renderOrderCard={renderOrderCard}
          />
        </div>
      )}
    </main>
  );
}
