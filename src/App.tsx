import React, { useState } from 'react';
import { Plus, Search, Lock } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VaultProvider, useVault } from './context/VaultContext';
import { PasswordCard } from './components/PasswordCard';
import { PasswordModal } from './components/PasswordModal';
import { SetupScreen } from './components/auth/SetupScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import type { PasswordRecord } from './types';

const VaultContent: React.FC = () => {
  const { records, loading, addRecord, updateRecord, deleteRecord } = useVault();
  const { lock } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PasswordRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddRecord = async (record: Omit<PasswordRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingRecord) {
      await updateRecord(editingRecord.id, record);
      setEditingRecord(null);
    } else {
      await addRecord(record);
    }
  };

  const handleEdit = (record: PasswordRecord) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this credential?')) {
      await deleteRecord(id);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const filteredRecords = records.filter(record =>
    record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.url?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img src="/icons/icon48.png" alt="Zk Vault" className="w-10 h-10 drop-shadow-md" />
            <div>
              <h1 className="text-3xl font-bold text-gradient">Zk Vault</h1>
              <p className="text-sm text-slate-400">Your secure password manager</p>
            </div>
          </div>
          <button
            onClick={lock}
            className="btn-secondary px-4 py-2 text-xs font-semibold tracking-wide uppercase hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 h-fit"
          >
            Logout
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search credentials..."
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
        Add New Credential
      </button>

      {/* Password List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Lock size={48} className="mx-auto mb-4 text-slate-600" />
          <h3 className="text-xl font-semibold text-slate-300 mb-2">
            {searchQuery ? 'No credentials found' : 'No credentials yet'}
          </h3>
          <p className="text-slate-500">
            {searchQuery
              ? 'Try a different search term'
              : 'Click "Add New Credential" to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-4 custom-scrollbar max-h-[500px] overflow-y-auto pr-2">
          {filteredRecords.map((record) => (
            <PasswordCard
              key={record.id}
              record={record}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <PasswordModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleAddRecord}
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
