export type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  basePrice: string;
  isAvailable: boolean;
};

export type MenuCategory = {
  id: string;
  name: string;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
  items: MenuItem[];
};
