"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getToken } from "@/lib/auth";
import { getMenu } from "@/lib/menu-api";
import { createOrder, getOrders, updateOrderStatus } from "@/lib/orders-api";
import { getTables } from "@/lib/tables-api";

import type { MenuCategory, MenuItem } from "@/types/menu";
import type { DiningTable } from "@/types/tables";
import type { OrderSourceType, OrderStatus } from "@/types/orders";

const ORDER_STATUSES: OrderStatus[] = [
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "SERVED",
  "CANCELLED",
  "CLOSED",
];

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

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

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
        <div className="flex items-center justify-between rounded-2xl bg-white p-6 shadow">
          <div>
            <h1 className="text-2xl font-semibold">Orders</h1>
            <p className="mt-1 text-sm text-gray-600">
              Create and manage dine-in orders.
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
            <h2 className="text-lg font-semibold">Create order</h2>

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

              <button
                onClick={handleCreateOrder}
                disabled={createOrderMutation.isPending}
                className="w-full rounded-xl bg-black px-4 py-2 text-white disabled:opacity-60"
              >
                {createOrderMutation.isPending ? "Creating..." : "Create order"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-lg font-semibold">All orders</h2>

            {ordersQuery.isLoading ? (
              <div className="mt-4 text-sm text-gray-600">
                Loading orders...
              </div>
            ) : null}

            {ordersQuery.isError ? (
              <div className="mt-4 rounded-xl bg-red-50 p-4 text-red-600">
                {ordersQuery.error instanceof Error
                  ? ordersQuery.error.message
                  : "Failed to load orders"}
              </div>
            ) : null}

            <div className="mt-4 space-y-4">
              {(ordersQuery.data ?? []).map((order) => (
                <div key={order.id} className="rounded-2xl border p-4">
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
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
