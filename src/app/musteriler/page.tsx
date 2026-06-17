'use client';

import Layout from '../../components/Layout';
import { Icons } from '../../utils/Icons';
import { useCustomersData } from '../../hooks/useCustomersData';
import CustomersTable from '../../components/musteriler/CustomersTable';
import CustomerFormModal from '../../components/musteriler/CustomerFormModal';

export default function MusterilerPage() {
  const {
    searchTerm,
    setSearchTerm,
    filteredCustomers,
    isLoading,
    error,
    isModalOpen,
    setIsModalOpen,
    selectedCustomer,
    formData,
    filamentInputs,
    filamentTypes,
    isSaving,
    deletingCustomerId,
    handleFormChange,
    handleFilamentChange,
    addFilamentPrice,
    removeFilamentPrice,
    handleAddCustomer,
    handleEditCustomer,
    handleDeleteCustomer,
    handleSaveCustomer,
  } = useCustomersData();

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Müşteriler</h1>
          <div className="flex gap-2">
            <button
              onClick={handleAddCustomer}
              className="btn-primary flex items-center gap-2"
            >
              <Icons.PlusIcon /> Yeni Müşteri
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
          <div className="search-container flex-grow">
            <Icons.SearchIcon className="search-icon" />
            <input
              type="text"
              placeholder="Müşteri ara..."
              className="w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-10 text-center">
            <div className="spinner mb-4" />
            <p>Müşteri verileri yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="py-10 text-center text-danger">
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="btn-primary mt-4">
              Yeniden Dene
            </button>
          </div>
        ) : (
          <CustomersTable
            customers={filteredCustomers}
            deletingCustomerId={deletingCustomerId}
            onEdit={handleEditCustomer}
            onDelete={handleDeleteCustomer}
          />
        )}
      </div>

      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedCustomer={selectedCustomer}
        formData={formData}
        filamentInputs={filamentInputs}
        filamentTypes={filamentTypes}
        isSaving={isSaving}
        onFormChange={handleFormChange}
        onFilamentChange={handleFilamentChange}
        onAddFilament={addFilamentPrice}
        onRemoveFilament={removeFilamentPrice}
        onSave={handleSaveCustomer}
      />
    </Layout>
  );
}
