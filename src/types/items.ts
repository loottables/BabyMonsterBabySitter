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
}

export const ITEM_DEFS: Record<ItemId, ItemDef> = {
  kibble: {
    id: "kibble",
    name: "Kibble",
    description: "Basic food. Restores hunger.",
  },
};
