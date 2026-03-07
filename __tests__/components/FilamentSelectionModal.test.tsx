import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FilamentSelectionModal from '@/components/FilamentSelectionModal';

vi.mock('@/utils/Icons', () => ({
  Icons: {
    XIcon: () => <span data-testid="icon-x" />,
    AlertTriangleIcon: () => <span data-testid="icon-alert" />,
    CheckIcon: () => <span data-testid="icon-check" />,
  },
}));

const mockBobins = [
  {
    id: 1,
    code: 'PLA-RED-001',
    name: 'PLA Kırmızı',
    type: 'PLA',
    brand: 'X',
    color: 'Kırmızı',
    remainingWeight: 500,
    totalWeight: 1000,
  },
];

describe('FilamentSelectionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify(mockBobins), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('kapalıyken içerik render olmamalı', () => {
    render(
      <FilamentSelectionModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        productFilaments={[{ type: 'PLA', color: 'Kırmızı', brand: 'X', weight: 100 }]}
        productName="Figür"
        productCode="PRD-001"
      />
    );
    expect(screen.queryByText(/bobin seçimi/i)).not.toBeInTheDocument();
  });

  it('açıkken ürün adı ve kodu görünmeli', async () => {
    render(
      <FilamentSelectionModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        productFilaments={[{ type: 'PLA', color: 'Kırmızı', brand: 'X', weight: 100 }]}
        productName="Figür"
        productCode="PRD-001"
      />
    );
    expect(screen.getByText(/Figür|PRD-001/)).toBeInTheDocument();
  });

  it('onClose tıklanınca çağrılmalı', async () => {
    const onClose = vi.fn();
    render(
      <FilamentSelectionModal
        isOpen={true}
        onClose={onClose}
        onConfirm={vi.fn()}
        productFilaments={[{ type: 'PLA', color: 'Kırmızı', brand: 'X', weight: 100 }]}
        productName="Test"
        productCode="P1"
      />
    );
    const closeButton = await screen.findByRole('button', { name: 'İptal' }, { timeout: 3000 });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });
});
