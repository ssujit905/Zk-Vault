import React, { useState, useRef, useEffect } from 'react';
import { Plus, Search, Lock, Settings, Crown, Zap, ShieldCheck, Users, HardDrive } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VaultProvider, useVault } from './context/VaultContext';
import { VaultItemCard } from './components/VaultItemCard';
import { VaultItemModal } from './components/VaultItemModal';
import { SetupScreen } from './components/auth/SetupScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import type { VaultRecord } from './types';

const VaultContent: React.FC = () => {
  const { records, loading, addRecord, updateRecord, deleteRecord } = useVault();
  const { lock, tier } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<VaultRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openOptions = (hash: string) => {
    chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS', hash });
    setIsDropdownOpen(false);
  };

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
      <div className="mb-8 relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img src="/icons/icon48.png" alt="Zk Vault" className="w-10 h-10 drop-shadow-md" />
            <div>
              <h1 className="text-2xl font-black text-white tracking-widest uppercase">Zk Vault</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 relative" ref={dropdownRef}>
            <div
              className={`flex items - center gap - 1.5 px - 3 py - 1.5 rounded - full border text - [9px] font - black uppercase tracking - widest ${tier === 'free' ? 'border-amber-500/20 text-amber-500 bg-amber-500/5' :
                  tier === 'pro' ? 'border-amber-500 text-amber-500 bg-amber-500/5' :
                    'border-primary-500 text-primary-400 bg-primary-500/5'
                } `}
            >
              {tier !== 'free' ? <Crown size={12} /> : <Zap size={12} className="animate-pulse" />}
              {tier}
            </div>

            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`p - 2 rounded - xl transition - all ${isDropdownOpen ? 'bg-primary-500/10 text-primary-400 ring-1 ring-primary-400/50' : 'text-slate-500 hover:text-white'} `}
            >
              <Settings size={20} className={isDropdownOpen ? 'animate-spin-slow' : ''} />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl p-2 z-[100] animate-in fade-in zoom-in-95 duration-200 backdrop-blur-3xl ring-1 ring-white/10">
                <div className="px-4 py-2 mb-1 border-b border-white/5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Security Menu</p>
                </div>
                <div className="space-y-1">
                  {[
                    { label: 'Security Audit', icon: ShieldCheck, hash: 'audit' },
                    { label: 'Family Sharing', icon: Users, hash: 'family' },
                    { label: 'Update Password', icon: Lock, hash: 'password' },
                    { label: 'Export Backup', icon: HardDrive, hash: 'data' },
                    { label: 'Import Data', icon: ShieldCheck, hash: 'data' },
                    { label: 'Subscription', icon: Crown, hash: 'billing' },
                  ].map(item => (
                    <button
                      key={`${item.label} -${item.hash} `}
                      onClick={() => openOptions(item.hash)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:bg-white/5 hover:text-white transition-all"
                    >
                      <item.icon size={14} />
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="mt-1 pt-1 border-t border-white/5 space-y-1">
                  <button
                    onClick={() => {
                      lock();
                      chrome.runtime.sendMessage({ type: 'SCHEDULE_CLIPBOARD_CLEAR' });
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all"
                  >
                    <Zap size={14} />
                    Panic Lock
                  </button>
                  <button
                    onClick={lock}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <Lock size={14} />
                    Log Out
                  </button>
                </div>
              </div>
            )}
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
