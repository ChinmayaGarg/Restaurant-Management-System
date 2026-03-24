"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getTables } from "@/lib/tables-api";
import { closeBill, generateBill, getBill } from "@/lib/billing-api";
import {
  getPaymentSummary,
  markCardPayment,
  markCashPayment,
} from "@/lib/payments-api";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { canDoAction } from "@/lib/access";

import type { DiningTable } from "@/types/tables";
import type { Bill, PaymentSummary } from "@/types/billing";

import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

function toMoney(value: string | number) {
  const number = typeof value === "string" ? Number(value) : value;
  return `$${number.toFixed(2)}`;
}

function getBillStatusTone(status: Bill["status"]) {
  switch (status) {
    case "DRAFT":
      return "gray";
    case "GENERATED":
      return "blue";
    case "PAID":
      return "green";
    case "VOID":
      return "red";
    case "CLOSED":
      return "purple";
    default:
      return "gray";
  }
}

function getPaymentStatusTone(status: string) {
  switch (status) {
    case "SUCCESS":
      return "green";
    case "PENDING":
      return "yellow";
    case "FAILED":
      return "red";
    case "REFUNDED":
    case "PARTIAL_REFUND":
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
  value: string | number;
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

export default function BillingPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [errorMessage, setErrorMessage] = useState("");
  const [tableSessionId, setTableSessionId] = useState("");
  const [billId, setBillId] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [cashNote, setCashNote] = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [cardProvider, setCardProvider] = useState("TERMINAL");
  const [cardReference, setCardReference] = useState("");
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

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
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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

      showToast({
        type: "success",
        title: "Cash payment recorded",
        message: "The payment was recorded successfully.",
      });

      await queryClient.invalidateQueries({ queryKey: ["bill", billId] });
      await queryClient.invalidateQueries({
        queryKey: ["payment-summary", billId],
      });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to record cash payment";
      setErrorMessage(message);
      showToast({
        type: "error",
        title: "Could not record cash payment",
        message,
      });
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

      showToast({
        type: "success",
        title: "Card payment recorded",
        message: "The payment was recorded successfully.",
      });

      await queryClient.invalidateQueries({ queryKey: ["bill", billId] });
      await queryClient.invalidateQueries({
        queryKey: ["payment-summary", billId],
      });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to record card payment";
      setErrorMessage(message);
      showToast({
        type: "error",
        title: "Could not record card payment",
        message,
      });
    },
  });

  const bill: Bill | undefined = billQuery.data;
  const paymentSummary: PaymentSummary | undefined = paymentSummaryQuery.data;

  const summary = useMemo(() => {
    if (!paymentSummary) {
      return {
        total: "$0.00",
        paid: "$0.00",
        balance: "$0.00",
        paymentCount: 0,
      };
    }

    return {
      total: toMoney(paymentSummary.totalAmount),
      paid: toMoney(paymentSummary.paidAmount),
      balance: toMoney(paymentSummary.balanceAmount),
      paymentCount: paymentSummary.payments.length,
    };
  }, [paymentSummary]);

  const canGenerate = canDoAction(user, "billing.generate");
  const canClose = canDoAction(user, "billing.close");
  const canMarkCash = canDoAction(user, "payments.markCash");
  const canMarkCard = canDoAction(user, "payments.markCard");

  return (
    <main className="space-y-6">
      <PageHeader
        title="Billing & Payments"
        description="Generate bills, inspect bill details, record payments, and close bills."
      />

      {errorMessage ? (
        <Card className="bg-red-50 text-red-600">{errorMessage}</Card>
      ) : null}

      {tablesQuery.isLoading ||
      (billId && billQuery.isLoading) ||
      (billId && paymentSummaryQuery.isLoading) ? (
        <Card>Loading billing data...</Card>
      ) : null}

      {tablesQuery.isError ||
      billQuery.isError ||
      paymentSummaryQuery.isError ? (
        <Card className="bg-red-50 text-red-600">
          {tablesQuery.error instanceof Error
            ? tablesQuery.error.message
            : billQuery.error instanceof Error
              ? billQuery.error.message
              : paymentSummaryQuery.error instanceof Error
                ? paymentSummaryQuery.error.message
                : "Failed to load billing data"}
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total"
          value={summary.total}
          sublabel="Bill total amount"
        />
        <SummaryCard
          label="Paid"
          value={summary.paid}
          sublabel="Total successful payments"
        />
        <SummaryCard
          label="Balance"
          value={summary.balance}
          sublabel="Amount still remaining"
        />
        <SummaryCard
          label="Payments"
          value={summary.paymentCount}
          sublabel="Recorded payment entries"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Generate bill"
              description="Choose an open table session and generate a bill."
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

              {canGenerate ? (
                <Button
                  className="w-full"
                  onClick={() => generateBillMutation.mutate(tableSessionId)}
                  disabled={!tableSessionId || generateBillMutation.isPending}
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Load bill"
              description="Paste a bill ID to inspect or update it."
            />

            <CardContent className="space-y-4">
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={billId}
                onChange={(e) => setBillId(e.target.value)}
                placeholder="Paste bill ID"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Record cash payment"
              description="Record a manual cash payment against the bill."
            />

            <CardContent className="space-y-4">
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

              {canMarkCash ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => markCashMutation.mutate()}
                  disabled={
                    !billId || !cashAmount || markCashMutation.isPending
                  }
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Record card payment"
              description="Record a manual card payment against the bill."
            />

            <CardContent className="space-y-4">
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

              {canMarkCard ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => markCardMutation.mutate()}
                  disabled={
                    !billId || !cardAmount || markCardMutation.isPending
                  }
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
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Bill details"
              description="Inspect bill items, totals, and bill status."
              action={
                bill ? (
                  <StatusBadge
                    label={bill.status}
                    tone={getBillStatusTone(bill.status)}
                  />
                ) : undefined
              }
            />

            <CardContent className="space-y-4">
              {!billId ? (
                <EmptyState
                  title="No bill loaded"
                  description="Generate a bill or paste a bill ID to view details."
                />
              ) : null}

              {bill ? (
                <>
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="font-medium">
                      {bill.billNumber} • {bill.tableSession.table.displayName}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {bill.tableSession.table.tableCode} •{" "}
                      {bill.tableSession.table.section.name}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      Generated at:{" "}
                      {bill.generatedAt
                        ? new Date(bill.generatedAt).toLocaleString()
                        : "N/A"}
                    </div>
                    {bill.closedAt ? (
                      <div className="mt-1 text-sm text-gray-600">
                        Closed at: {new Date(bill.closedAt).toLocaleString()}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    {bill.items.map((item) => (
                      <Card key={item.id} className="border p-4 shadow-none">
                        <div className="flex items-center justify-between gap-3">
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
                      </Card>
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

                  {canClose ? (
                    <Button
                      variant="outline"
                      onClick={() => setConfirmCloseOpen(true)}
                      disabled={closeBillMutation.isPending}
                    >
                      {closeBillMutation.isPending
                        ? "Closing..."
                        : "Close bill"}
                    </Button>
                  ) : null}
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Payment summary"
              description="See paid amount, balance, and recorded payment entries."
            />

            <CardContent className="space-y-4">
              {!paymentSummary && !paymentSummaryQuery.isLoading ? (
                <EmptyState
                  title="No payment summary yet"
                  description="Load a bill to view payment progress."
                />
              ) : null}

              {paymentSummary ? (
                <>
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
                    {paymentSummary.payments.length === 0 ? (
                      <EmptyState
                        title="No payments recorded"
                        description="Use the payment forms on the left to record cash or card payments."
                      />
                    ) : (
                      paymentSummary.payments.map((payment) => (
                        <Card
                          key={payment.id}
                          className="border p-4 shadow-none"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="font-medium">
                                  {payment.method}
                                </div>
                                <StatusBadge
                                  label={payment.status}
                                  tone={getPaymentStatusTone(payment.status)}
                                />
                              </div>

                              <div className="text-sm text-gray-500">
                                {payment.provider ?? "N/A"}
                                {payment.providerReference
                                  ? ` • ${payment.providerReference}`
                                  : ""}
                              </div>

                              <div className="text-xs text-gray-500">
                                {payment.paidAt
                                  ? new Date(payment.paidAt).toLocaleString()
                                  : "Pending"}
                              </div>
                            </div>

                            <div className="font-medium">
                              {toMoney(payment.amount)}
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
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
    </main>
  );
}
