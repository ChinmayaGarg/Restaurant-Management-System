export type ServiceRequestType =
  | "CALL_SERVER"
  | "REQUEST_BILL"
  | "WATER"
  | "CLEANING"
  | "HELP"
  | "READY_TO_ORDER";

export type ServiceRequestSourceType = "QR" | "BUTTON" | "STAFF" | "SYSTEM";

export type ServiceRequestStatus =
  | "OPEN"
  | "ACKNOWLEDGED"
  | "RESOLVED"
  | "ESCALATED"
  | "CANCELLED";

export type ServiceRequestUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type ServiceRequestHistory = {
  id: string;
  fromStatus: ServiceRequestStatus | null;
  toStatus: ServiceRequestStatus;
  changedAt: string;
  changedByUser: ServiceRequestUser | null;
};

export type ServiceRequestTableSession = {
  id: string;
  assignedServerId?: string | null;
  table: {
    id: string;
    displayName: string;
    tableCode: string;
    section: {
      id: string;
      name: string;
    };
  };
};

export type ServiceRequest = {
  id: string;
  tableSessionId: string;
  requestType: ServiceRequestType;
  sourceType: ServiceRequestSourceType;
  sourceDeviceId: string | null;
  status: ServiceRequestStatus;
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdByUser: ServiceRequestUser | null;
  assignedToUser: ServiceRequestUser | null;
  tableSession: ServiceRequestTableSession;
  history: ServiceRequestHistory[];
};

export type CreateServiceRequestPayload = {
  tableSessionId: string;
  requestType: ServiceRequestType;
  sourceType: ServiceRequestSourceType;
  sourceDeviceId?: string;
};
