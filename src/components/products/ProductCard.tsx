'use client';

import Image from 'next/image';
import { ProductData } from '../ProductModal';
import { Icons } from '../../utils/Icons';

interface ProductCardProps {
  product: ProductData;
  isAdmin: boolean;
  onShowDetails: (product: ProductData) => void;
  onEdit: (product: ProductData) => void;
  onDuplicate: (product: ProductData) => void;
  onDelete: (productId: string) => void;
}

export function ProductCard({
  product,
  isAdmin,
  onShowDetails,
  onEdit,
  onDuplicate,
  onDelete,
}: ProductCardProps) {
  const formatDimensions = () =>
    `${product.dimensionX}x${product.dimensionY}x${product.dimensionZ} mm`;

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-2 md:p-3">
      <div className="relative aspect-[4/3] max-h-32 md:max-h-36 mb-2 bg-secondary rounded-md overflow-hidden">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.productType || 'Ürün'}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 200px"
            className="object-contain"
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            Görsel Yok
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-start gap-1">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-xs md:text-sm truncate">{product.code}</h3>
            <p className="text-xs text-muted-foreground truncate">{product.productType}</p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={() => onShowDetails(product)}
              className="p-0.5 md:p-1 hover:text-primary"
              title="Detayları Göster"
              aria-label="Ürün detaylarını göster"
            >
              <Icons.EyeIcon className="w-3 h-3 md:w-4 md:h-4" />
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => onEdit(product)}
                  className="p-0.5 md:p-1 hover:text-primary"
                  title="Düzenle"
                  aria-label="Ürünü düzenle"
                >
                  <Icons.EditIcon className="w-3 h-3 md:w-4 md:h-4" />
                </button>
                <button
                  onClick={() => onDuplicate(product)}
                  className="p-0.5 md:p-1 hover:text-primary"
                  title="Kopyala"
                  aria-label="Ürünü kopyala"
                >
                  <Icons.ClipboardIcon className="w-3 h-3 md:w-4 md:h-4" />
                </button>
                <button
                  onClick={() => onDelete(product.id!)}
                  className="p-0.5 md:p-1 hover:text-destructive"
                  title="Sil"
                  aria-label="Ürünü sil"
                >
                  <Icons.TrashIcon className="w-3 h-3 md:w-4 md:h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="text-xs space-y-0.5">
          <p className="truncate">Boyut: {formatDimensions()}</p>
          <p className="truncate">Kap: {product.capacity}/tabla</p>
          <p className="truncate">Süre: {product.printTime}s</p>
        </div>
      </div>
    </div>
  );
}
