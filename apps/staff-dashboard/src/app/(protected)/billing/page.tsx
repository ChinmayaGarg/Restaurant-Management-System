"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { canDoAction } from "@/lib/access";
import { closeBill, generateBill, getBill } from "@/lib/billing-api";
import {
  getPaymentSummary,
  markCardPayment,
  markCashPayment,
} from "@/lib/payments-api";
import { getTables } from "@/lib/tables-api";

import type { Bill, PaymentSummary } from "@/types/billing";
import type { DiningTable } from "@/types/tables";

import { useToast } from "@/providers/toast-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

function toMoney(value: string | number) {
  const number = typeof value === "string" ? Number(value) : value;
  return `$${number.toFixed(2)}`;
}

export default function BillingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [tableSessionId, setTableSessionId] = useState("");
  const [billId, setBillId] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [cashNote, setCashNote] = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [cardProvider, setCardProvider] = useState("TERMINAL");
  const [cardReference, setCardReference] = useState("");

  const tablesQuery = useQuery({
    queryKey: ["tables"],
    queryFn: getTables,
  });

  const billQuery = useQuery({
    queryKey: ["bill", billId],
    queryFn: () => getBill(billId),
    enabled: Boolean(billId),
  });

  const paymentSummaryQuery = useQuery({
    queryKey: ["payment-summary", billId],
    queryFn: () => getPaymentSummary(billId),
    enabled: Boolean(billId),
  });

  const openSessions = useMemo(() => {
    const tables = tablesQuery.data ?? [];
    return tables.flatMap((table: DiningTable) =>
      table.sessions.map((session) => ({
        sessionId: session.id,
        tableName: table.displayName,
        tableCode: table.tableCode,
        sectionName: table.section.name,
      })),
    );
  }, [tablesQuery.data]);

  const generateBillMutation = useMutation({
    mutationFn: (sessionId: string) => generateBill(sessionId),
    onSuccess: async (bill) => {
      setErrorMessage("");
      setBillId(bill.id);
      showToast({
        type: "success",
        title: "Bill generated",
        message: `Bill ${bill.billNumber} was created successfully.`,
      });
      await queryClient.invalidateQueries({ queryKey: ["bill", bill.id] });
      await queryClient.invalidateQueries({
        queryKey: ["payment-summary", bill.id],
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to generate bill";
      setErrorMessage(message);
      showToast({
        type: "error",
        title: "Could not generate bill",
        message,
      });
    },
  });

  const closeBillMutation = useMutation({
    mutationFn: (id: string) => closeBill(id),
    onSuccess: async (bill) => {
      setErrorMessage("");
      setConfirmCloseOpen(false);
      showToast({
        type: "success",
        title: "Bill closed",
        message: `Bill ${bill.billNumber} was closed successfully.`,
      });
      await queryClient.invalidateQueries({ queryKey: ["bill", bill.id] });
      await queryClient.invalidateQueries({
        queryKey: ["payment-summary", bill.id],
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to close bill";
      setErrorMessage(message);
      showToast({
        type: "error",
        title: "Could not close bill",
        message,
      });
    },
  });

  const markCashMutation = useMutation({
    mutationFn: async () => {
      if (!billId) throw new Error("Choose a bill first");
      return markCashPayment(billId, Number(cashAmount), cashNote || undefined);
    },
    onSuccess: async () => {
      setErrorMessage("");
      setCashAmount("");
      setCashNote("");
      await queryClient.invalidateQueries({ queryKey: ["bill", billId] });
      await queryClient.invalidateQueries({
        queryKey: ["payment-summary", billId],
      });
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to record cash payment",
      );
    },
  });

  const markCardMutation = useMutation({
    mutationFn: async () => {
      if (!billId) throw new Error("Choose a bill first");
      return markCardPayment(
        billId,
        Number(cardAmount),
        cardProvider || undefined,
        cardReference || undefined,
      );
    },
    onSuccess: async () => {
      setErrorMessage("");
      setCardAmount("");
      setCardReference("");
      await queryClient.invalidateQueries({ queryKey: ["bill", billId] });
      await queryClient.invalidateQueries({
        queryKey: ["payment-summary", billId],
      });
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to record card payment",
      );
    },
  });

  const bill: Bill | undefined = billQuery.data;
  const paymentSummary: PaymentSummary | undefined = paymentSummaryQuery.data;

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Billing & Payments"
          description="Generate bills, inspect bill details, record payments, and close bills."
        />

        {errorMessage ? (
          <div className="rounded-2xl bg-red-50 p-4 text-red-600">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader title="Generate bill" />
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
                        <option
                          key={session.sessionId}
                          value={session.sessionId}
                        >
                          {session.tableName} ({session.tableCode}) •{" "}
                          {session.sectionName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {canDoAction(user, "billing.generate") ? (
                    <Button
                      onClick={() =>
                        generateBillMutation.mutate(tableSessionId)
                      }
                      disabled={
                        !tableSessionId || generateBillMutation.isPending
                      }
                      className="w-full"
                    >
                      {generateBillMutation.isPending
                        ? "Generating..."
                        : "Generate bill"}
                    </Button>
                  ) : (
                    <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-500">
                      You do not have permission to generate bills.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Load bill" />
              <CardContent>
                <div className="space-y-4">
                  <input
                    className="w-full rounded-xl border px-3 py-2"
                    value={billId}
                    onChange={(e) => setBillId(e.target.value)}
                    placeholder="Paste bill ID"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Record cash payment" />
              <CardContent>
                <div className="space-y-4">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="w-full rounded-xl border px-3 py-2"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="Amount"
                  />
                  <input
                    className="w-full rounded-xl border px-3 py-2"
                    value={cashNote}
                    onChange={(e) => setCashNote(e.target.value)}
                    placeholder="Optional note"
                  />
                  {canDoAction(user, "payments.markCash") ? (
                    <Button
                      variant="outline"
                      onClick={() => markCashMutation.mutate()}
                      disabled={
                        !billId || !cashAmount || markCashMutation.isPending
                      }
                      className="w-full"
                    >
                      {markCashMutation.isPending
                        ? "Saving..."
                        : "Mark cash payment"}
                    </Button>
                  ) : (
                    <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-500">
                      You do not have permission to record cash payments.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Record card payment" />
              <CardContent>
                <div className="space-y-4">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="w-full rounded-xl border px-3 py-2"
                    value={cardAmount}
                    onChange={(e) => setCardAmount(e.target.value)}
                    placeholder="Amount"
                  />
                  <input
                    className="w-full rounded-xl border px-3 py-2"
                    value={cardProvider}
                    onChange={(e) => setCardProvider(e.target.value)}
                    placeholder="Provider"
                  />
                  <input
                    className="w-full rounded-xl border px-3 py-2"
                    value={cardReference}
                    onChange={(e) => setCardReference(e.target.value)}
                    placeholder="Reference"
                  />
                  {canDoAction(user, "payments.markCard") ? (
                    <Button
                      variant="outline"
                      onClick={() => markCardMutation.mutate()}
                      disabled={
                        !billId || !cardAmount || markCardMutation.isPending
                      }
                      className="w-full"
                    >
                      {markCardMutation.isPending
                        ? "Saving..."
                        : "Mark card payment"}
                    </Button>
                  ) : (
                    <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-500">
                      You do not have permission to record card payments.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Bill details"
                action={
                  bill && canDoAction(user, "billing.close") ? (
                    <Button
                      onClick={() => setConfirmCloseOpen(true)}
                      disabled={closeBillMutation.isPending}
                      variant="outline"
                    >
                      Close bill
                    </Button>
                  ) : null
                }
              />
              <CardContent>
                {bill ? (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      {bill.billNumber} •{" "}
                      <StatusBadge label={bill.status} tone="gray" />
                    </p>
                  </div>
                ) : null}

                {!billId ? (
                  <EmptyState
                    title="No bill loaded"
                    description="Generate or load a bill to view details."
                  />
                ) : null}

                {billQuery.isLoading ? (
                  <div className="text-sm text-gray-600">Loading bill...</div>
                ) : null}

                {bill ? (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-gray-50 p-4">
                      <div className="font-medium">
                        {bill.tableSession.table.displayName} •{" "}
                        {bill.tableSession.table.section.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        Table code: {bill.tableSession.table.tableCode}
                      </div>
                      <div className="text-sm text-gray-600">
                        Generated at:{" "}
                        {bill.generatedAt
                          ? new Date(bill.generatedAt).toLocaleString()
                          : "N/A"}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {bill.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-xl border p-3"
                        >
                          <div>
                            <div className="font-medium">
                              {item.nameSnapshot} × {item.quantity}
                            </div>
                            <div className="text-sm text-gray-500">
                              Unit price: {toMoney(item.unitPrice)}
                            </div>
                          </div>
                          <div className="font-medium">
                            {toMoney(item.lineTotal)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4 text-sm space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{toMoney(bill.subtotalAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Discount</span>
                        <span>{toMoney(bill.discountAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax</span>
                        <span>{toMoney(bill.taxAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Service charge</span>
                        <span>{toMoney(bill.serviceChargeAmount)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 font-semibold">
                        <span>Total</span>
                        <span>{toMoney(bill.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Payment summary" />
              <CardContent>
                {paymentSummaryQuery.isLoading ? (
                  <div className="mt-4 text-sm text-gray-600">
                    Loading payment summary...
                  </div>
                ) : null}

                {paymentSummary ? (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-xl bg-gray-50 p-4 text-sm space-y-2">
                      <div className="flex justify-between">
                        <span>Total</span>
                        <span>{toMoney(paymentSummary.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Paid</span>
                        <span>{toMoney(paymentSummary.paidAmount)}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Balance</span>
                        <span>{toMoney(paymentSummary.balanceAmount)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {paymentSummary.payments.map((payment) => (
                        <div key={payment.id} className="rounded-xl border p-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">
                              {payment.method} • {payment.status}
                            </div>
                            <div className="font-medium">
                              {toMoney(payment.amount)}
                            </div>
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            {payment.provider ?? "N/A"}{" "}
                            {payment.providerReference
                              ? `• ${payment.providerReference}`
                              : ""}
                          </div>
                          <div className="text-xs text-gray-500">
                            {payment.paidAt
                              ? new Date(payment.paidAt).toLocaleString()
                              : "Pending"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  !paymentSummaryQuery.isLoading && (
                    <EmptyState
                      title="No payment summary"
                      description="Load a bill to view payment summary."
                    />
                  )
                )}
              </CardContent>
            </Card>
          </div>
          <ConfirmDialog
            open={confirmCloseOpen}
            title="Close bill?"
            message="This will mark the bill as closed."
            confirmLabel="Close bill"
            loading={closeBillMutation.isPending}
            onCancel={() => setConfirmCloseOpen(false)}
            onConfirm={() => {
              if (bill) {
                closeBillMutation.mutate(bill.id);
              }
            }}
          />
        </div>
      </div>
    </main>
  );
}
