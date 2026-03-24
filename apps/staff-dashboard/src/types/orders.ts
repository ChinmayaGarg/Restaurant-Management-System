export type OrderStatus =
  | "PLACED"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "CANCELLED"
  | "CLOSED";

export type OrderSourceType = "STAFF" | "QR" | "KIOSK" | "MOBILE_APP";

export type OrderStatusHistoryUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type OrderStatusHistory = {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedAt: string;
  changedByUser: OrderStatusHistoryUser | null;
};

export type OrderItemModifier = {
  id: string;
  priceDelta: string;
  modifierOption: {
    id: string;
    name: string;
  };
};

export type OrderItem = {
  id: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  specialInstructions: string | null;
  status: string;
  menuItem: {
    id: string;
    name: string;
  };
  modifiers: OrderItemModifier[];
};

export type OrderTable = {
  id: string;
  displayName: string;
  tableCode: string;
  section: {
    id: string;
    name: string;
  };
};

export type OrderTableSession = {
  id: string;
  table: OrderTable;
};

export type Order = {
  id: string;
  tableSessionId: string;
  sourceType: OrderSourceType;
  notes: string | null;
  status: OrderStatus;
  subtotalAmount: string;
  createdAt: string;
  updatedAt: string;
  tableSession: OrderTableSession;
  items: OrderItem[];
  statusHistory: OrderStatusHistory[];
};

export type CreateOrderPayload = {
  tableSessionId: string;
  sourceType: OrderSourceType;
  notes?: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    specialInstructions?: string;
  }>;
};
