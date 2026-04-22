import type { Inventory, ItemId } from "@/types/items";

const KEY = "bmbs_inventory_v1";

export function createDefaultInventory(): Inventory {
  const inv: Inventory = Array(9).fill(null);
  inv[0] = { itemId: "kibble", quantity: 20 };
  return inv;
}

export function loadInventory(): Inventory {
  if (typeof window === "undefined") return createDefaultInventory();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return createDefaultInventory();
    const parsed = JSON.parse(raw) as Inventory;
    // Ensure exactly 9 slots
    const inv: Inventory = Array(9).fill(null);
    for (let i = 0; i < 9; i++) inv[i] = parsed[i] ?? null;
    return inv;
  } catch {
    return createDefaultInventory();
  }
}

export function saveInventory(inv: Inventory) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(inv));
}

export function consumeSlot(
  inv: Inventory,
  index: number,
): { inv: Inventory; itemId: ItemId } | null {
  const slot = inv[index];
  if (!slot) return null;
  const next = [...inv];
  next[index] = slot.quantity <= 1 ? null : { ...slot, quantity: slot.quantity - 1 };
  return { inv: next, itemId: slot.itemId };
}

export function clearInventory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function deleteSlot(inv: Inventory, index: number): Inventory {
  const next = [...inv];
  next[index] = null;
  return next;
}
