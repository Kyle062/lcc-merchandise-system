export interface PendingRefundRequest {
  id: string;
  group_id: number;
  group_code?: string;
  user_id: number;
  student_name: string;
  reason: string;
  amount: number;
  requested_at: string;
  status: "pending";
}

const STORAGE_KEY = "lcc_pending_refund_requests";

const readRequests = (): PendingRefundRequest[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeRequests = (requests: PendingRefundRequest[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
};

export const getPendingRefunds = (): PendingRefundRequest[] => readRequests();

export const getPendingRefundForGroup = (
  groupId: number,
): PendingRefundRequest | null =>
  readRequests().find((request) => Number(request.group_id) === groupId) || null;

export const savePendingRefund = (request: PendingRefundRequest) => {
  const requests = readRequests().filter(
    (existing) => Number(existing.group_id) !== Number(request.group_id),
  );
  writeRequests([request, ...requests]);
};

export const removePendingRefund = (id: string) => {
  writeRequests(readRequests().filter((request) => request.id !== id));
};
