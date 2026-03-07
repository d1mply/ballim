'use client';

import Image from 'next/image';
import type { ProductData } from '../ProductModal';

const BLUR_PLACEHOLDER =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==';

type ProductDetailModalProps = {
  product: ProductData | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (product: ProductData) => void;
  isAdmin: boolean;
};

export default function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onEdit,
  isAdmin,
}: ProductDetailModalProps) {
  if (!isOpen || !product) return null;

  const imgSrc = product.image || BLUR_PLACEHOLDER;

  return (
    <div className="modal">
      <div className="modal-content max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="modal-header">
          <h2 className="text-lg font-semibold">Ürün Detayı - {product.code}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-muted rounded-md overflow-hidden flex items-center justify-center min-h-[300px]">
              <Image
                src={imgSrc}
                alt={product.code}
                width={500}
                height={500}
                className="object-contain w-full max-w-[500px] h-[500px]"
                placeholder="blur"
                blurDataURL={BLUR_PLACEHOLDER}
              />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">{product.productType}</h3>
              <p className="text-sm text-muted-foreground mb-4">Ürün Kodu: {product.code}</p>
              <div className="space-y-2 text-sm">
                <p>
                  Boyutlar: {product.dimensionX} x {product.dimensionY} x {product.dimensionZ} mm
                </p>
                <p>Kapasite: {product.capacity} adet / tabla</p>
                <p>Baskı Süresi: {product.printTime} saat</p>
                <p>
                  Ağırlık: Toplam {product.totalGram}g, Adet {product.pieceGram}g
                </p>
                <p>Dosya: {product.filePath || 'Belirtilmemiş'}</p>
              </div>
            </div>
          </div>
          {isAdmin && product.filaments && product.filaments.length > 0 && (
            <div className="mt-4 overflow-hidden border border-border rounded-md">
              <table className="w-full">
                <thead className="bg-muted text-left">
                  <tr>
                    <th className="py-2 px-4 font-medium">Tip</th>
                    <th className="py-2 px-4 font-medium">Renk</th>
                    <th className="py-2 px-4 font-medium">Marka</th>
                    <th className="py-2 px-4 font-medium">Ağırlık</th>
                  </tr>
                </thead>
                <tbody>
                  {product.filaments.map((f, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-2 px-4">{f.type}</td>
                      <td className="py-2 px-4">{f.color}</td>
                      <td className="py-2 px-4">{f.brand}</td>
                      <td className="py-2 px-4">{f.weight}g</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {product.notes && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Notlar</h4>
              <div className="p-3 bg-muted rounded-md">{product.notes}</div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          {isAdmin && onEdit && (
            <button onClick={() => onEdit(product)} className="btn-primary">
              Düzenle
            </button>
          )}
          <button onClick={onClose} className="btn-secondary">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
