import React, { useState } from 'react';
import { Plus, Search, Lock, Settings, ShieldAlert } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VaultProvider, useVault } from './context/VaultContext';
import { VaultItemCard } from './components/VaultItemCard';
import { VaultItemModal } from './components/VaultItemModal';
import { SetupScreen } from './components/auth/SetupScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import { StatusPanel } from './components/StatusPanel';
import type { VaultRecord } from './types';

const VaultContent: React.FC = () => {
  const { records, loading, addRecord, updateRecord, deleteRecord } = useVault();
  const { lock } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<VaultRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSaveRecord = async (record: any) => {
    if (editingRecord) {
      await updateRecord(editingRecord.id, record);
      setEditingRecord(null);
    } else {
      await addRecord(record);
    }
  };

  const handleEdit = (record: VaultRecord) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteRecord(id);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const filteredRecords = records.filter(record => {
    const q = searchQuery.toLowerCase();
    const inTitle = record.title.toLowerCase().includes(q);

    let inSpecific = false;
    if (record.type === 'login') {
      inSpecific = record.username.toLowerCase().includes(q) || (record.url?.toLowerCase().includes(q) ?? false);
    } else if (record.type === 'identity') {
      inSpecific = record.email.toLowerCase().includes(q) || record.firstName.toLowerCase().includes(q) || record.lastName.toLowerCase().includes(q);
    } else if (record.type === 'card') {
      inSpecific = record.cardholderName.toLowerCase().includes(q) || (record.brand?.toLowerCase().includes(q) ?? false);
    } else if (record.type === 'note') {
      inSpecific = record.content.toLowerCase().includes(q);
    }

    return inTitle || inSpecific;
  });

  return (
    <div className="min-h-screen w-full p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img src="/icons/icon48.png" alt="Zk Vault" className="w-10 h-10 drop-shadow-md" />
            <div>
              <h1 className="text-3xl font-bold text-gradient">Zk Vault</h1>
              <StatusPanel compact />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                lock();
                chrome.runtime.sendMessage({ type: 'SCHEDULE_CLIPBOARD_CLEAR' });
              }}
              className="btn-icon p-2 hover:bg-yellow-500/10 hover:text-yellow-400"
              title="Panic: Lock & Clear"
            >
              <ShieldAlert size={18} />
            </button>
            <button
              onClick={lock}
              className="btn-icon p-2 hover:bg-red-500/10 hover:text-red-400"
              title="Lock Vault"
            >
              <Lock size={18} />
            </button>
            <button
              onClick={() => chrome.runtime.openOptionsPage()}
              className="btn-icon p-2"
              title="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search vault..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-glass pl-12"
          />
        </div>
      </div>

      {/* Add Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="btn-primary w-full mb-6 flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add New Item
      </button>

      {/* Item List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
            <Lock size={32} className="text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-300 mb-2">
            {searchQuery ? 'No items found' : 'Vault is empty'}
          </h3>
          <p className="text-slate-500 text-sm">
            {searchQuery
              ? 'Try a different search term'
              : 'Securely store logins, notes, identities, and cards.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4 custom-scrollbar max-h-[500px] overflow-y-auto pr-2">
          {filteredRecords.map((record) => (
            <VaultItemCard
              key={record.id}
              record={record}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <VaultItemModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveRecord}
        editRecord={editingRecord}
      />
    </div>
  );
};

const AuthShell: React.FC = () => {
  const { loading, hasVault, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center relative">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!hasVault) {
    return <SetupScreen />;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <VaultProvider>
      <VaultContent />
    </VaultProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <AuthShell />
    </AuthProvider>
  );
}

export default App;
