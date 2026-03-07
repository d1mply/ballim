import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrderCard } from '@/components/production/OrderCard';
import type { OrderItem, OrderProduct } from '@/types';

const mockProduct: OrderProduct = {
  id: '1',
  productId: '1',
  productCode: 'P1',
  productType: 'Figür',
  quantity: 2,
  status: 'onay_bekliyor',
};

const mockOrder: OrderItem = {
  id: '1',
  orderCode: 'SIP-1',
  customerName: 'Test Müşteri',
  orderDate: '2024-01-15',
  status: 'Onay Bekliyor',
  totalAmount: 100,
  notes: '',
  products: [mockProduct],
};

describe('OrderCard', () => {
  it('sipariş kodu ve müşteri adı render olmalı', () => {
    render(
      <OrderCard
        order={mockOrder}
        onProductStatusChange={vi.fn()}
        onCompleteProduction={vi.fn()}
      />
    );
    expect(screen.getByText('SIP-1')).toBeInTheDocument();
    expect(screen.getByText(/Test Müşteri/)).toBeInTheDocument();
  });

  it('ürün bilgisi ve miktar görünmeli', () => {
    render(
      <OrderCard
        order={mockOrder}
        onProductStatusChange={vi.fn()}
        onCompleteProduction={vi.fn()}
      />
    );
    expect(screen.getByText(/P1 - Figür/)).toBeInTheDocument();
    expect(screen.getByText(/Miktar: 2 adet/)).toBeInTheDocument();
  });

  it('onay_bekliyor üründe üretime başla tıklanınca onProductStatusChange çağrılmalı', () => {
    const onProductStatusChange = vi.fn();
    render(
      <OrderCard
        order={mockOrder}
        onProductStatusChange={onProductStatusChange}
        onCompleteProduction={vi.fn()}
      />
    );
    const startButton = screen.getByRole('button', { name: /üretime al/i });
    fireEvent.click(startButton);
    expect(onProductStatusChange).toHaveBeenCalledWith(mockOrder, mockProduct);
  });
});
