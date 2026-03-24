export type BillStatus = "DRAFT" | "GENERATED" | "PAID" | "VOID" | "CLOSED";

export type BillUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type BillTableSession = {
  id: string;
  table: {
    id: string;
    displayName: string;
    tableCode: string;
    section: {
      id: string;
      name: string;
    };
  };
  openedByUser: BillUser;
  assignedServer: BillUser | null;
};

export type BillItem = {
  id: string;
  nameSnapshot: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type BillPayment = {
  id: string;
  method: "CASH" | "CARD" | "ONLINE";
  provider: string | null;
  providerReference: string | null;
  amount: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED" | "PARTIAL_REFUND";
  paidAt: string | null;
  createdAt: string;
  recordedByUser: BillUser | null;
};

export type Bill = {
  id: string;
  billNumber: string;
  status: BillStatus;
  subtotalAmount: string;
  discountAmount: string;
  taxAmount: string;
  serviceChargeAmount: string;
  totalAmount: string;
  generatedAt: string | null;
  closedAt: string | null;
  tableSession: BillTableSession;
  generatedByUser: BillUser | null;
  items: BillItem[];
  payments: BillPayment[];
};

export type PaymentSummary = {
  billId: string;
  billNumber: string;
  billStatus: BillStatus;
  totalAmount: string;
  paidAmount: string;
  balanceAmount: string;
  payments: BillPayment[];
};
