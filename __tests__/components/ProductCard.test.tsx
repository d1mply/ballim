import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '@/components/products/ProductCard';
import type { ProductData } from '@/components/ProductModal';

vi.mock('@/utils/Icons', () => ({
  Icons: {
    EyeIcon: () => <span data-testid="icon-eye" />,
    EditIcon: () => <span data-testid="icon-edit" />,
    ClipboardIcon: () => <span data-testid="icon-copy" />,
    TrashIcon: () => <span data-testid="icon-trash" />,
  },
}));
vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const mockProduct: ProductData = {
  code: 'PRD-001',
  productType: 'Figür',
  capacity: 10,
  dimensionX: 10,
  dimensionY: 10,
  dimensionZ: 10,
  printTime: 60,
  totalGram: 100,
  pieceGram: 10,
  filaments: [],
  availableStock: 5,
  createdAt: '2024-01-01',
};

describe('ProductCard', () => {
  it('ürün kodu ve tipi render olmalı', () => {
    const onShowDetails = vi.fn();
    const onEdit = vi.fn();
    const onDuplicate = vi.fn();
    const onDelete = vi.fn();
    render(
      <ProductCard
        product={mockProduct}
        isAdmin={false}
        onShowDetails={onShowDetails}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    );
    expect(screen.getByText('PRD-001')).toBeInTheDocument();
    expect(screen.getByText('Figür')).toBeInTheDocument();
  });

  it('detay butonuna tıklanınca onShowDetails çağrılmalı', () => {
    const onShowDetails = vi.fn();
    render(
      <ProductCard
        product={mockProduct}
        isAdmin={false}
        onShowDetails={onShowDetails}
        onEdit={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    const detailButton = screen.getByLabelText(/ürün detaylarını göster/i);
    fireEvent.click(detailButton);
    expect(onShowDetails).toHaveBeenCalledWith(mockProduct);
  });

  it('admin ise düzenle ve kopyala butonları görünmeli', () => {
    render(
      <ProductCard
        product={mockProduct}
        isAdmin={true}
        onShowDetails={vi.fn()}
        onEdit={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByLabelText(/ürünü düzenle/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ürünü kopyala/i)).toBeInTheDocument();
  });
});
