export type ItemId = "kibble" | "treat" | "energy_drink" | "medicine" | "vaccine" | "name_change";

export interface InventorySlot {
  itemId: ItemId;
  quantity: number;
}

// 9 slots (3×3 grid) — null = empty
export type Inventory = (InventorySlot | null)[];

export interface ItemDef {
  id:          ItemId;
  name:        string;
  description: string;
  stats:       string[];
  actionLabel: string;
  price:       number;
}

export const ITEM_DEFS: Record<ItemId, ItemDef> = {
  kibble: {
    id:          "kibble",
    name:        "Kibble",
    description: "Basic monster food.",
    stats:       ["Restores 30 hunger", "+5 happiness"],
    actionLabel: "Feed to",
    price:       5,
  },
  treat: {
    id:          "treat",
    name:        "Treat",
    description: "A sweet snack your monster loves.",
    stats:       ["+40 happiness", "+5 hunger"],
    actionLabel: "Give to",
    price:       20,
  },
  energy_drink: {
    id:          "energy_drink",
    name:        "Energy Drink",
    description: "Instantly restores all energy.",
    stats:       ["Restores energy to max"],
    actionLabel: "Give to",
    price:       15,
  },
  medicine: {
    id:          "medicine",
    name:        "Medicine",
    description: "Heals your monster back to full HP.",
    stats:       ["Restores HP to max"],
    actionLabel: "Use on",
    price:       30,
  },
  vaccine: {
    id:          "vaccine",
    name:        "Vaccine",
    description: "Cures your monster's illness immediately.",
    stats:       ["Cures sickness"],
    actionLabel: "Use on",
    price:       25,
  },
  name_change: {
    id:          "name_change",
    name:        "Name Change",
    description: "Allows you to rename your monster. Click the monster's name to use it.",
    stats:       ["Lets you rename your monster"],
    actionLabel: "",   // used via name click, not the bag use flow
    price:       500,
  },
};

// Base shop items always available
export const SHOP_ITEMS: ItemId[] = ["kibble", "treat", "energy_drink", "medicine", "vaccine"];
// Unlocked in the shop after the first free rename is used
export const SHOP_ITEMS_EXTENDED: ItemId[] = [...SHOP_ITEMS, "name_change"];
