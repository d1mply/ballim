'use client';

import Layout from '../../components/Layout';
import { Icons } from '../../utils/Icons';
import FilamentModal from '../../components/FilamentModal';
import StockAddModal from '../../components/StockAddModal';
import PriceRangesPanel from '../../components/filamentler/PriceRangesPanel';
import FilamentsTable from '../../components/filamentler/FilamentsTable';
import FilamentHistoryModal, { useFilamentHistory } from '../../components/filamentler/FilamentHistoryModal';
import { useFilamentsData } from '../../hooks/useFilamentsData';
import { usePriceRanges } from '../../hooks/usePriceRanges';

export default function FilamentlerPage() {
  const {
    filteredFilaments, types, isLoading, error,
    searchTerm, setSearchTerm, typeFilter, setTypeFilter,
    selectedFilament, isModalOpen, isStockModalOpen, selectedFilamentForStock,
    handleAddFilament, handleEditFilament, handleSaveFilament, handleDeleteFilament,
    handleAddStock, handleSaveStock, closeFilamentModal, closeStockModal,
    calculateRemainingPercentage, isStockCritical, formatWeight,
  } = useFilamentsData();

  const {
    priceRanges, showPriceRanges, setShowPriceRanges,
    priceRangeForm, editingPriceRange,
    handlePriceRangeFormChange, handlePriceRangeSave,
    handlePriceRangeEdit, handlePriceRangeDelete, resetPriceRangeForm,
  } = usePriceRanges();

  const {
    isHistoryOpen, historyLoading, historyItems, historyFor,
    handleShowHistory, closeHistory,
  } = useFilamentHistory();

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Filament Yönetimi</h1>
          <button onClick={handleAddFilament} className="btn-primary flex items-center gap-2">
            <Icons.PlusIcon /> Yeni Filament
          </button>
        </div>

        <PriceRangesPanel
          priceRanges={priceRanges}
          showPriceRanges={showPriceRanges}
          setShowPriceRanges={setShowPriceRanges}
          priceRangeForm={priceRangeForm}
          editingPriceRange={editingPriceRange}
          handlePriceRangeFormChange={handlePriceRangeFormChange}
          handlePriceRangeSave={handlePriceRangeSave}
          handlePriceRangeEdit={handlePriceRangeEdit}
          handlePriceRangeDelete={handlePriceRangeDelete}
          resetPriceRangeForm={resetPriceRangeForm}
        />

        <FilamentsTable
          filaments={filteredFilaments}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          types={types}
          isLoading={isLoading}
          error={error}
          onAddStock={handleAddStock}
          onShowHistory={handleShowHistory}
          onEdit={handleEditFilament}
          onDelete={handleDeleteFilament}
          calculateRemainingPercentage={calculateRemainingPercentage}
          isStockCritical={isStockCritical}
          formatWeight={formatWeight}
        />
      </div>

      <FilamentModal
        isOpen={isModalOpen}
        onClose={closeFilamentModal}
        onSave={handleSaveFilament}
        filament={selectedFilament}
      />

      <StockAddModal
        isOpen={isStockModalOpen}
        onClose={closeStockModal}
        onSave={handleSaveStock}
        filament={selectedFilamentForStock}
      />

      <FilamentHistoryModal
        isOpen={isHistoryOpen}
        historyFor={historyFor}
        historyLoading={historyLoading}
        historyItems={historyItems}
        onClose={closeHistory}
      />
    </Layout>
  );
}
