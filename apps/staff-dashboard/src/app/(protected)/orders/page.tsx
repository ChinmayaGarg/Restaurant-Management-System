"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getMenu } from "@/lib/menu-api";
import { createOrder, getOrders, updateOrderStatus } from "@/lib/orders-api";
import { getTables } from "@/lib/tables-api";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { canDoAction } from "@/lib/access";

import type { MenuCategory, MenuItem } from "@/types/menu";
import type { DiningTable } from "@/types/tables";
import type { OrderSourceType, OrderStatus } from "@/types/orders";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

const ORDER_STATUSES: OrderStatus[] = [
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "SERVED",
  "CANCELLED",
  "CLOSED",
];

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

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [errorMessage, setErrorMessage] = useState("");
  const [tableSessionId, setTableSessionId] = useState("");
  const [menuItemId, setMenuItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [sourceType, setSourceType] = useState<OrderSourceType>("STAFF");

  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: getOrders,
  });

  const tablesQuery = useQuery({
    queryKey: ["tables"],
    queryFn: getTables,
  });

  const menuQuery = useQuery({
    queryKey: ["menu"],
    queryFn: getMenu,
  });

  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: async () => {
      setErrorMessage("");
      setTableSessionId("");
      setMenuItemId("");
      setQuantity("1");
      setSpecialInstructions("");
      setNotes("");
      setSourceType("STAFF");

      showToast({
        type: "success",
        title: "Order created",
        message: "The order was created successfully.",
      });

      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to create order";
      setErrorMessage(message);
      showToast({
        type: "error",
        title: "Could not create order",
        message,
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (params: { orderId: string; status: OrderStatus }) =>
      updateOrderStatus(params.orderId, params.status),
    onSuccess: async () => {
      setErrorMessage("");
      showToast({
        type: "success",
        title: "Order updated",
        message: "The order status was updated successfully.",
      });
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["kitchen-queue"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to update order";
      setErrorMessage(message);
      showToast({
        type: "error",
        title: "Could not update order",
        message,
      });
    },
  });

  const openSessions = useMemo(() => {
    const tables = tablesQuery.data ?? [];
    return tables.flatMap((table: DiningTable) =>
      table.sessions.map((session) => ({
        sessionId: session.id,
        guestCount: session.guestCount,
        tableId: table.id,
        tableName: table.displayName,
        tableCode: table.tableCode,
        sectionName: table.section.name,
      })),
    );
  }, [tablesQuery.data]);

  const availableMenuItems = useMemo(() => {
    const categories = menuQuery.data ?? [];
    return categories.flatMap((category: MenuCategory) =>
      category.items
        .filter((item: MenuItem) => item.isAvailable)
        .map((item: MenuItem) => ({
          ...item,
          categoryName: category.name,
        })),
    );
  }, [menuQuery.data]);

  const orders = ordersQuery.data ?? [];

  const summary = useMemo(() => {
    return {
      totalOrders: orders.length,
      activeOrders: orders.filter((order) =>
        ["PLACED", "ACCEPTED", "PREPARING", "READY"].includes(order.status),
      ).length,
      readyOrders: orders.filter((order) => order.status === "READY").length,
      closedOrders: orders.filter((order) => order.status === "CLOSED").length,
    };
  }, [orders]);

  function handleCreateOrder() {
    if (!tableSessionId || !menuItemId) {
      setErrorMessage("Please choose a table session and a menu item");
      showToast({
        type: "error",
        title: "Missing information",
        message: "Please choose a table session and a menu item.",
      });
      return;
    }

    createOrderMutation.mutate({
      tableSessionId,
      sourceType,
      notes: notes || undefined,
      items: [
        {
          menuItemId,
          quantity: Number(quantity),
          specialInstructions: specialInstructions || undefined,
        },
      ],
    });
  }

  return (
    <main className="space-y-6">
      <PageHeader
        title="Orders"
        description="Create and manage dine-in orders."
      />

      {errorMessage ? (
        <Card className="bg-red-50 text-red-600">{errorMessage}</Card>
      ) : null}

      {ordersQuery.isLoading || tablesQuery.isLoading || menuQuery.isLoading ? (
        <Card>Loading orders...</Card>
      ) : null}

      {ordersQuery.isError || tablesQuery.isError || menuQuery.isError ? (
        <Card className="bg-red-50 text-red-600">
          {ordersQuery.error instanceof Error
            ? ordersQuery.error.message
            : tablesQuery.error instanceof Error
              ? tablesQuery.error.message
              : menuQuery.error instanceof Error
                ? menuQuery.error.message
                : "Failed to load order data"}
        </Card>
      ) : null}

      {!ordersQuery.isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Orders"
            value={summary.totalOrders}
            sublabel="All orders currently loaded"
          />
          <SummaryCard
            label="Active Orders"
            value={summary.activeOrders}
            sublabel="Placed, accepted, preparing, or ready"
          />
          <SummaryCard
            label="Ready Orders"
            value={summary.readyOrders}
            sublabel="Ready for service or pickup"
          />
          <SummaryCard
            label="Closed Orders"
            value={summary.closedOrders}
            sublabel="Completed order flow"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader
            title="Create order"
            description="Select an open table session and an available menu item."
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
              <label className="mb-1 block text-sm font-medium">Source</label>
              <select
                className="w-full rounded-xl border px-3 py-2"
                value={sourceType}
                onChange={(e) =>
                  setSourceType(e.target.value as OrderSourceType)
                }
              >
                <option value="STAFF">STAFF</option>
                <option value="QR">QR</option>
                <option value="KIOSK">KIOSK</option>
                <option value="MOBILE_APP">MOBILE_APP</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Menu item
              </label>
              <select
                className="w-full rounded-xl border px-3 py-2"
                value={menuItemId}
                onChange={(e) => setMenuItemId(e.target.value)}
              >
                <option value="">Select an item</option>
                {availableMenuItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} • {item.categoryName} • ${item.basePrice}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Quantity</label>
              <input
                type="number"
                min={1}
                className="w-full rounded-xl border px-3 py-2"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Special instructions
              </label>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="No onions, extra spicy..."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Order notes
              </label>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional order-level note"
              />
            </div>

            {canDoAction(user, "orders.create") ? (
              <Button
                className="w-full"
                onClick={handleCreateOrder}
                disabled={createOrderMutation.isPending}
              >
                {createOrderMutation.isPending ? "Creating..." : "Create order"}
              </Button>
            ) : (
              <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-500">
                You do not have permission to create orders.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="All orders"
            description="Track order progress and update statuses."
          />

          <CardContent className="space-y-4">
            {orders.length === 0 && !ordersQuery.isLoading ? (
              <EmptyState
                title="No orders yet"
                description="Create a new order from the left panel to get started."
              />
            ) : null}

            {orders.map((order) => (
              <Card key={order.id} className="border p-4 shadow-none">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="font-semibold">
                        {order.tableSession.table.displayName} •{" "}
                        {order.tableSession.table.section.name}
                      </div>
                      <StatusBadge
                        label={order.status}
                        tone={getOrderStatusTone(order.status)}
                      />
                    </div>

                    <div className="mt-1 text-sm text-gray-500">
                      Order ID: {order.id}
                    </div>
                    <div className="text-sm text-gray-500">
                      Source: {order.sourceType}
                    </div>
                    <div className="text-sm text-gray-500">
                      Subtotal: ${order.subtotalAmount}
                    </div>

                    {order.notes ? (
                      <div className="mt-1 text-sm text-gray-600">
                        Notes: {order.notes}
                      </div>
                    ) : null}
                  </div>

                  <div className="w-full md:w-56">
                    <label className="mb-1 block text-sm font-medium">
                      Order status
                    </label>

                    {canDoAction(user, "orders.updateStatus") ? (
                      <select
                        className="w-full rounded-xl border px-3 py-2"
                        value={order.status}
                        onChange={(e) =>
                          updateStatusMutation.mutate({
                            orderId: order.id,
                            status: e.target.value as OrderStatus,
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                      >
                        {ORDER_STATUSES.map((status) => (
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

                <div className="mt-4">
                  <div className="mb-2 text-sm font-medium">Items</div>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="rounded-xl bg-gray-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium">
                              {item.menuItem.name} × {item.quantity}
                            </div>
                            <div className="text-sm text-gray-500">
                              Status: {item.status}
                            </div>
                            {item.specialInstructions ? (
                              <div className="text-sm text-gray-600">
                                Instructions: {item.specialInstructions}
                              </div>
                            ) : null}
                          </div>

                          <div className="text-sm font-medium">
                            ${item.lineTotal}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  Created: {new Date(order.createdAt).toLocaleString()}
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
