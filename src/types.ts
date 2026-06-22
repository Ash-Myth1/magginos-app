// src/types.ts

export interface MenuItem {
  id: number;
  name: string;
  desc: string;
  price: number;
  tag: string;
}

export interface CartItem extends MenuItem {
  qty: number;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  block: string;
  room: string;
  orderType: 'delivery' | 'takeaway';
  paymentMethod: 'upi' | 'cod';
  email?: string;
  uid?: string;
}

export interface OrderItem {
  id: number;
  name: string;
  qty: number;
  price: number;
  rating: number;
  feedback: string;
}

export type OrderStatus =
  | 'Received'
  | 'Cooking'
  | 'Out for Delivery'
  | 'Ready for Pickup'
  | 'Delivered';

export interface OrderTimestamps {
  placedAt: number;
  acceptedAt?: number;
  readyAt?: number;
  deliveredAt?: number;
}

export interface Order {
  dbId: string;
  displayId: string;
  items: OrderItem[];
  total: number;
  subtotal: number;
  deliveryFee: number;
  orderType: 'delivery' | 'takeaway';
  paymentMethod: 'upi' | 'cod';
  customer: CustomerInfo;
  status: OrderStatus;
  time: string;
  timestamp: number;
  timestamps?: OrderTimestamps;
}

export interface CrewUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'admin' | 'chef' | 'delivery' | 'customer';
}

export interface ItemRating {
  stars: number;
  hover: number;
  feedback: string;
}
