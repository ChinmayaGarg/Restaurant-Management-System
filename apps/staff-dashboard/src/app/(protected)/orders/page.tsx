"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { getMenu } from "@/lib/menu-api";
import { createOrder, getOrders, updateOrderStatus } from "@/lib/orders-api";
import { getTables } from "@/lib/tables-api";

import type { MenuCategory, MenuItem } from "@/types/menu";
import type { OrderSourceType, OrderStatus } from "@/types/orders";
import type { DiningTable } from "@/types/tables";
import { useAuth } from "@/providers/auth-provider";
import { canDoAction } from "@/lib/access";
const ORDER_STATUSES: OrderStatus[] = [
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "SERVED",
  "CANCELLED",
  "CLOSED",
];

import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function OrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [errorMessage, setErrorMessage] = useState("");
  const [tableSessionId, setTableSessionId] = useState("");
  const [menuItemId, setMenuItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [sourceType, setSourceType] = useState<OrderSourceType>("STAFF");

  const { user } = useAuth();

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
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create order",
      );
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (params: { orderId: string; status: OrderStatus }) =>
      updateOrderStatus(params.orderId, params.status),
    onSuccess: async () => {
      setErrorMessage("");
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update order",
      );
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

  function handleCreateOrder() {
    if (!tableSessionId || !menuItemId) {
      setErrorMessage("Please choose a table session and a menu item");
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
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Orders"
          description="Create and manage dine-in orders."
        />

        {errorMessage ? (
          <div className="rounded-2xl bg-red-50 p-4 text-red-600">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <Card>
            <CardHeader title="Create order" />
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
                    Source
                  </label>
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
                  <label className="mb-1 block text-sm font-medium">
                    Quantity
                  </label>
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
                    onClick={handleCreateOrder}
                    disabled={createOrderMutation.isPending}
                  >
                    {createOrderMutation.isPending
                      ? "Creating..."
                      : "Create order"}
                  </Button>
                ) : (
                  <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-500">
                    You do not have permission to create orders.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="All orders" />
            <CardContent>
              {ordersQuery.isLoading ? (
                <div className="text-sm text-gray-600">Loading orders...</div>
              ) : null}

              {ordersQuery.isError ? (
                <div className="rounded-xl bg-red-50 p-4 text-red-600">
                  {ordersQuery.error instanceof Error
                    ? ordersQuery.error.message
                    : "Failed to load orders"}
                </div>
              ) : null}

              <div className="space-y-4">
                {(ordersQuery.data ?? []).map((order) => (
                  <Card key={order.id} className="p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="font-semibold">
                          {order.tableSession.table.displayName} •{" "}
                          {order.tableSession.table.section.name}
                        </div>
                        <div className="text-sm text-gray-500">
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
                          <div
                            key={item.id}
                            className="rounded-xl bg-gray-50 p-3"
                          >
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
              </div>

              {!ordersQuery.isLoading &&
              (ordersQuery.data ?? []).length === 0 ? (
                <EmptyState
                  title="No orders yet"
                  description="Orders will appear here when created."
                />
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
