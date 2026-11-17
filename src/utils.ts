import type { Customer, Order, OrderItem, OrderStatus } from './types';

export const orderTotal = (items: OrderItem[] = []): number =>
  items.reduce((sum, item) => sum + Number(item.preco || 0) * Number(item.quantidade || 0), 0);

export const validOrders = (orders: Order[]): Order[] => orders.filter((order) => order.status !== 'cancelado');

export const customerPurchaseTotal = (customerId: Customer['id'], orders: Order[]): number =>
  validOrders(orders)
    .filter((order) => String(order.clienteId ?? order.cliente_id) === String(customerId))
    .reduce((sum, order) => sum + orderTotal(order.itens), 0);

export const customerBadge = (customerId: Customer['id'], orders: Order[]): 'VIP' | 'Regular' | 'Sem compras' => {
  const purchases = validOrders(orders).filter((order) => String(order.clienteId ?? order.cliente_id) === String(customerId));
  if (!purchases.length) return 'Sem compras';
  return customerPurchaseTotal(customerId, orders) >= 2000 ? 'VIP' : 'Regular';
};

export const topCustomers = (customers: Customer[], orders: Order[]) => customers
  .map((customer) => ({ customer, total: customerPurchaseTotal(customer.id, orders) }))
  .filter((entry) => entry.total > 0)
  .sort((a, b) => b.total - a.total)
  .slice(0, 3);

export const sumAllSales = (orders: Order[]): number => validOrders(orders).reduce((sum, order) => sum + orderTotal(order.itens), 0);

export const statusSummary = (orders: Order[], status: OrderStatus) => {
  const matching = orders.filter((order) => order.status === status);
  return { count: matching.length, total: matching.reduce((sum, order) => sum + orderTotal(order.itens), 0) };
};

export const orderDate = (order: Order): string => String(order.createdAt ?? order.created_at ?? order.data ?? '');

export const formatCurrency = (value: number): string => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const formatDate = (value?: string): string => {
  if (!value) return 'Data não informada';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export function extractList<T>(payload: unknown, key: string): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record[key])) return record[key] as T[];
    if (Array.isArray(record.data)) return record.data as T[];
  }
  return [];
}
