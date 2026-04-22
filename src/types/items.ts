export type ItemId = "kibble";

export interface InventorySlot {
  itemId: ItemId;
  quantity: number;
}

// 9 slots (3×3 grid) — null = empty
export type Inventory = (InventorySlot | null)[];

export interface ItemDef {
  id: ItemId;
  name: string;
  description: string;
  stats: string[];       // displayed in detail panel
  actionLabel: string;   // e.g. "Feed to" — monster name appended at runtime
}

export const ITEM_DEFS: Record<ItemId, ItemDef> = {
  kibble: {
    id: "kibble",
    name: "Kibble",
    description: "Basic monster food.",
    stats: ["Restores 30 hunger", "+5 happiness"],
    actionLabel: "Feed to",
  },
};
