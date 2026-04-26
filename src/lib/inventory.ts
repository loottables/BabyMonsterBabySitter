import type { Inventory, ItemId } from "@/types/items";
import { ITEM_DEFS } from "@/types/items";

function compact(inv: Inventory): Inventory {
  const filled = inv.filter(s => s !== null);
  return [...filled, ...Array(inv.length - filled.length).fill(null)] as Inventory;
}

// Strips slots with unknown itemIds (from stale saves) and re-compacts.
export function sanitizeInventory(inv: unknown[]): Inventory {
  const valid = new Set(Object.keys(ITEM_DEFS));
  const cleaned = inv.map((s: unknown) =>
    s && typeof s === "object" && "itemId" in s && valid.has((s as { itemId: string }).itemId)
      ? s as Inventory[number]
      : null
  );
  return compact(cleaned);
}

// New players start with 20 kibble in slot 0; remaining slots empty
export function createDefaultInventory(): Inventory {
  const inv: Inventory = Array(9).fill(null);
  inv[0] = { itemId: "kibble", quantity: 20 };
  return inv;
}

// Removes one unit from the given slot; nulls the slot if it was the last
export function consumeSlot(
  inv: Inventory,
  index: number,
): { inv: Inventory; itemId: ItemId } | null {
  const slot = inv[index];
  if (!slot) return null;
  const next = [...inv];
  next[index] = slot.quantity <= 1 ? null : { ...slot, quantity: slot.quantity - 1 };
  return { inv: compact(next), itemId: slot.itemId };
}

// Stacks onto an existing slot of the same item, or occupies an empty slot.
// Returns null if the bag is full.
export function addToInventory(inv: Inventory, itemId: ItemId): Inventory | null {
  const stackIdx = inv.findIndex(s => s?.itemId === itemId);
  if (stackIdx !== -1) {
    const next = [...inv];
    next[stackIdx] = { itemId, quantity: inv[stackIdx]!.quantity + 1 };
    return next;
  }
  const emptyIdx = inv.findIndex(s => s === null);
  if (emptyIdx === -1) return null;
  const next = [...inv];
  next[emptyIdx] = { itemId, quantity: 1 };
  return next;
}

export function deleteSlot(inv: Inventory, index: number): Inventory {
  const next = [...inv];
  next[index] = null;
  return compact(next);
}
