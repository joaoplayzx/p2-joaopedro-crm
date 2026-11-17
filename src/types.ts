export type OrderStatus = 'aberto' | 'pago' | 'cancelado';
export type ContactChannel = 'telefone' | 'e-mail' | 'WhatsApp' | 'presencial';

export interface Customer {
  id: number | string;
  nome: string;
  email: string;
  telefone?: string;
  empresa?: string;
  cidade?: string;
  [key: string]: unknown;
}

export interface OrderItem {
  titulo: string;
  preco: number;
  quantidade: number;
}

export interface Order {
  id: number | string;
  clienteId?: number | string;
  cliente_id?: number | string;
  itens: OrderItem[];
  status: OrderStatus;
  createdAt?: string;
  data?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface Contact {
  id: number | string;
  titulo: string;
  texto: string;
  canal: ContactChannel;
  createdAt?: string;
  data?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface User {
  nome?: string;
  username?: string;
  name?: string;
  [key: string]: unknown;
}

export interface CustomerPayload {
  nome: string;
  email: string;
  telefone?: string;
  empresa?: string;
  cidade?: string;
}
