'use client';

import Layout from '../../components/Layout';
import { Icons } from '../../utils/Icons';
import PaymentReceipt from '../../components/PaymentReceipt';
import { useOdemelerData } from '../../hooks/useOdemelerData';
import { useOdemelerFilters } from '../../hooks/useOdemelerFilters';
import OdemelerFilters from '../../components/odemeler/OdemelerFilters';
import OdemelerTable from '../../components/odemeler/OdemelerTable';
import OdemeFormModal from '../../components/odemeler/OdemeFormModal';

export default function OdemelerPage() {
  const {
    customers, siparisler, odemeler,
    isLoading, error, success,
    selectedMusteriId, isModalOpen, selectedOdeme, formData,
    isReceiptOpen, receiptData,
    setIsModalOpen, setIsReceiptOpen, setReceiptData,
    handleFormChange, handleMusteriChange,
    handleAddOdeme, handleEditOdeme, handleSaveOdeme,
    handleDeleteOdeme, handlePrintReceipt,
  } = useOdemelerData();

  const {
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    dateRange, setDateRange,
    filteredOdemeler,
  } = useOdemelerFilters(odemeler);

  return (
    <Layout>
      <div className="container mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold mb-6">Ödemeler</h1>

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <OdemelerFilters
          customers={customers}
          selectedMusteriId={selectedMusteriId}
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          dateRange={dateRange}
          onMusteriChange={handleMusteriChange}
          onSearchChange={setSearchTerm}
          onStatusChange={setStatusFilter}
          onDateRangeChange={(partial) => setDateRange(prev => ({ ...prev, ...partial }))}
        />

        <div className="flex justify-end mb-4">
          <button onClick={handleAddOdeme} className="btn-primary flex items-center">
            <Icons.PlusIcon className="h-5 w-5 mr-1" />
            Yeni Ödeme
          </button>
        </div>

        <OdemelerTable
          filteredOdemeler={filteredOdemeler}
          selectedMusteriId={selectedMusteriId}
          isLoading={isLoading}
          onEdit={handleEditOdeme}
          onDelete={handleDeleteOdeme}
          onPrintReceipt={handlePrintReceipt}
        />
      </div>

      <OdemeFormModal
        isOpen={isModalOpen}
        selectedOdeme={selectedOdeme}
        formData={formData}
        customers={customers}
        siparisler={siparisler}
        onClose={() => setIsModalOpen(false)}
        onFormChange={handleFormChange}
        onMusteriChange={handleMusteriChange}
        onSave={handleSaveOdeme}
      />

      {isReceiptOpen && receiptData && (
        <PaymentReceipt
          paymentData={receiptData}
          onClose={() => {
            setIsReceiptOpen(false);
            setReceiptData(null);
          }}
        />
      )}
    </Layout>
  );
}
