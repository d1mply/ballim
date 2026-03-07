import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toast } from '@/components/Toast';
import type { Toast as ToastType } from '@/contexts/ToastContext';

const mockContextValue = {
  removeToast: vi.fn(),
  toasts: [],
  showToast: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};

vi.mock('@/contexts/ToastContext', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
  useToast: () => mockContextValue,
}));
vi.mock('@/utils/Icons', () => ({
  Icons: {
    XIcon: () => <span data-testid="icon-x" />,
  },
}));

describe('Toast', () => {
  it('toast mesajı ve tipine göre render olmalı', () => {
    const toast: ToastType = {
      id: '1',
      type: 'success',
      message: 'Kayıt başarılı',
    };
    render(<Toast toast={toast} />);
    expect(screen.getByText('Kayıt başarılı')).toBeInTheDocument();
  });

  it('error tipi kırmızı sınıflar içermeli', () => {
    const toast: ToastType = { id: '2', type: 'error', message: 'Hata' };
    const { container } = render(<Toast toast={toast} />);
    expect(screen.getByText('Hata')).toBeInTheDocument();
    expect(container.querySelector('.border-red-200')).toBeInTheDocument();
  });

  it('kapat butonuna tıklanınca removeToast çağrılmalı', () => {
    mockContextValue.removeToast.mockClear();
    const toast: ToastType = { id: '3', type: 'info', message: 'Bilgi' };
    render(<Toast toast={toast} />);
    const closeButton = screen.getByRole('button', { name: /kapat/i });
    fireEvent.click(closeButton);
    expect(mockContextValue.removeToast).toHaveBeenCalledWith('3');
  });
});
