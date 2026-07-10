export type ProductStatus = "active" | "draft" | "archived";

export interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  hsn: string;
  unit: string;
  retailPrice: number;
  wholesalePrice: number;
  purchaseCost: number;
  gstRate: number;
  stock: number;
  reserved: number;
  reorderLevel: number;
  warehouse: string;
  status: ProductStatus;
  image: string; // emoji placeholder for mock
  variants?: string[];
}

export type InvoiceStatus = "paid" | "pending" | "overdue" | "draft" | "partially-paid";

export interface Invoice {
  id: string;
  number: string;
  customer: string;
  customerType: "B2B" | "B2C";
  date: string;
  dueDate: string;
  amount: number;
  balance: number;
  status: InvoiceStatus;
  items: number;
}

export type BidStatus = "open" | "closing-soon" | "evaluation" | "awarded" | "closed" | "draft";

export interface BidLineItem {
  id: string;
  product: string;
  category: string;
  spec: string;
  qty: number;
  unit: string;
  deliveryLocation: string;
  deadline: string;
}

export interface SupplierQuote {
  supplier: string;
  rating: number;
  previousOrders: number;
  compliant: boolean;
  unitPrice: number;
  deliveryDays: number;
  warrantyMonths: number;
  taxPct: number;
  freight: number;
  brand: string;
  origin: string;
  validUntil: string;
  technicalScore: number;
  commercialScore: number;
  status: "received" | "shortlisted" | "rejected" | "awarded";
}

export interface Bid {
  id: string;
  number: string;
  title: string;
  status: BidStatus;
  createdAt: string;
  closesAt: string;
  items: BidLineItem[];
  responses: number;
  estimatedValue: number;
  quotes: SupplierQuote[];
  source: "private" | "gem"; // GeM = Government e-Marketplace style tender
}

export interface Customer {
  id: string;
  name: string;
  type: "B2B" | "B2C";
  contact: string;
  email: string;
  phone: string;
  gstin?: string;
  billingAddress?: string;
  balance: number;
  totalBusiness: number;
  since: string;
}
