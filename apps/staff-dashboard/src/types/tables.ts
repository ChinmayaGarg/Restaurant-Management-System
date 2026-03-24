export type TableStatus =
  | "AVAILABLE"
  | "OCCUPIED"
  | "RESERVED"
  | "CLEANING"
  | "OUT_OF_SERVICE";

export type TableSessionUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type TableSession = {
  id: string;
  status: "OPEN" | "CLOSED" | "CANCELLED";
  guestCount: number | null;
  openedAt: string;
  closedAt: string | null;
  openedByUser: TableSessionUser;
  assignedServer: TableSessionUser | null;
};

export type Section = {
  id: string;
  name: string;
  displayOrder: number;
};

export type DiningTable = {
  id: string;
  tableCode: string;
  displayName: string;
  capacity: number;
  status: TableStatus;
  section: Section;
  sessions: TableSession[];
};
