import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Sidebar from '@/components/Sidebar';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/admin-dashboard'),
  useRouter: () => ({ push: mockPush }),
}));
vi.mock('next/link', () => ({
  default: function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  },
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Ballim başlığı render olmalı', () => {
    render(<Sidebar />);
    expect(screen.getByText('Ballim')).toBeInTheDocument();
  });

  it('admin için menü öğeleri görünmeli', () => {
    render(<Sidebar userType="admin" />);
    expect(screen.getByText('Ana Sayfa')).toBeInTheDocument();
    expect(screen.getByText('Ürünler')).toBeInTheDocument();
    expect(screen.getByText('Sipariş Takip')).toBeInTheDocument();
    expect(screen.getByText('Ayarlar')).toBeInTheDocument();
  });

  it('customer için daha az menü öğesi olmalı', () => {
    render(<Sidebar userType="customer" />);
    expect(screen.getByText('Ana Sayfa')).toBeInTheDocument();
    expect(screen.getByText('Ürünler')).toBeInTheDocument();
    expect(screen.queryByText('Ayarlar')).not.toBeInTheDocument();
  });

  it('aside role complementary ve aria-label olmalı', () => {
    render(<Sidebar />);
    const aside = screen.getByRole('complementary', { name: /ana navigasyon/i });
    expect(aside).toBeInTheDocument();
  });
});
