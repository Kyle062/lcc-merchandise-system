// Client-side registry of receipts rejected by the scanner as tampered.
// Blocked groups are never presented to the Order Management table and can
// never be confirmed by the scanner in this browser session.

const STORAGE_KEY = "lcc_blocked_order_groups";

const readBlocked = (): number[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(Number) : [];
  } catch {
    return [];
  }
};

export const getBlockedGroupIds = (): number[] => readBlocked();

export const isGroupBlocked = (groupId: number): boolean =>
  readBlocked().includes(Number(groupId));

export const blockOrderGroup = (groupId: number) => {
  const blocked = readBlocked();
  const id = Number(groupId);
  if (!Number.isInteger(id) || blocked.includes(id)) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...blocked, id]));
};
