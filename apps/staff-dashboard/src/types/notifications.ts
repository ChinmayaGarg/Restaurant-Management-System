export type NotificationItem = {
  id: string;
  branchId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  targetUserId: string | null;
  createdAt: string;
  readAt: string | null;
};

export type NotificationReadEvent = {
  id: string;
  isRead: true;
  readAt: string | null;
};
