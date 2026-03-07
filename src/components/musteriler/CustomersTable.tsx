'use client';

import { Icons } from '../../utils/Icons';
import type { Customer } from '../../hooks/useCustomersData';

interface CustomersTableProps {
  customers: Customer[];
  deletingCustomerId: string | null;
  onEdit: (customer: Customer) => void;
  onDelete: (customerId: string) => void;
}

export default function CustomersTable({
  customers,
  deletingCustomerId,
  onEdit,
  onDelete,
}: CustomersTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Müşteri</th>
            <th>Tip</th>
            <th>İletişim</th>
            <th>Vergi No</th>
            <th>Kullanıcı Adı</th>
            <th>Filamentler</th>
            <th>Sipariş Sayısı</th>
            <th>Toplam</th>
            <th>Son Sipariş</th>
            <th className="text-center">İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {customers.length > 0 ? (
            customers.map((customer) => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                isDeleting={deletingCustomerId === customer.id}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          ) : (
            <tr>
              <td colSpan={10} className="py-8 text-center text-muted-foreground">
                Müşteri bulunamadı.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function CustomerRow({
  customer,
  isDeleting,
  onEdit,
  onDelete,
}: {
  customer: Customer;
  isDeleting: boolean;
  onEdit: (customer: Customer) => void;
  onDelete: (customerId: string) => void;
}) {
  return (
    <tr>
      <td>
        <div>
          <div className="font-medium">{customer.name}</div>
          {customer.company && (
            <div className="text-sm text-muted-foreground">{customer.company}</div>
          )}
        </div>
      </td>
      <td>
        <div>
          <div>{customer.type || 'Bireysel'}</div>
          {customer.customerCategory === 'wholesale' && (
            <div className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full inline-block mt-1">
              Toptancı %{customer.discountRate}
            </div>
          )}
        </div>
      </td>
      <td>
        <div>
          <div>{customer.phone}</div>
          <div className="text-sm text-muted-foreground">{customer.email}</div>
        </div>
      </td>
      <td>{customer.type === 'Kurumsal' ? customer.taxNumber || '-' : '-'}</td>
      <td>{customer.username || '-'}</td>
      <td>
        <div className="text-sm">
          {customer.customerCategory === 'wholesale' ? (
            <div className="text-purple-600 font-medium">Gram Aralığı Sistemi</div>
          ) : customer.filamentPrices && customer.filamentPrices.length > 0 ? (
            customer.filamentPrices.map((fp, i) => (
              <div key={i}>
                {fp.type}: {fp.price}₺
              </div>
            ))
          ) : (
            <div>Tanımlanmamış</div>
          )}
        </div>
      </td>
      <td>{customer.orders || 0}</td>
      <td>{customer.totalSpent || 0}₺</td>
      <td>{customer.lastOrder || '-'}</td>
      <td>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => onEdit(customer)}
            className="action-btn action-btn-edit"
            title="Düzenle"
            disabled={isDeleting}
          >
            <Icons.EditIcon />
          </button>
          <button
            onClick={() => onDelete(customer.id)}
            className="action-btn action-btn-delete"
            title="Sil"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Icons.TrashIcon />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}
