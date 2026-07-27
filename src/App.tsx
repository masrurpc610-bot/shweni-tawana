/* eslint-disable */
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import {
  LayoutDashboard, Users, ReceiptText, Building2,
  Moon, Sun, Search, Trash2, Edit, BookOpen, Plus, X, Printer, FileText, ArrowRight, MinusCircle, LogOut, Lock, User
} from 'lucide-react';

type ReceiptItem = { id: number; name: string; quantity: number | string; unit: string; price: number | string; isNew: boolean; type?: 'item' | 'payment'; note?: string; dateStr?: string; timeStr?: string };
type CustomerReceipt = { id: number; date: string; items: ReceiptItem[] };
type Customer = { id: number; name: string; phone: string; address: string; notes: string; balance: number; date: string; debtReceipts: CustomerReceipt[], user_id?: string };
type SavedReceipt = { id: number; customerName: string; phone: string; date: string; totalAmount: number; type: 'cash'; items: ReceiptItem[], user_id?: string };

const convertToEnglishDigits = (val: any): string => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  const persianNumbers = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicNumbers = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let res = str;
  for (let i = 0; i < 10; i++) {
    res = res.replace(persianNumbers[i], String(i)).replace(arabicNumbers[i], String(i));
  }
  return res;
};

const parseNumber = (val: any): number => {
  const converted = convertToEnglishDigits(val);
  const num = parseFloat(converted);
  return isNaN(num) ? 0 : num;
};

const THEMES: Record<string, any> = {
  emerald: { main: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-600', light: 'bg-emerald-100', textDark: 'text-emerald-700' },
  blue: { main: 'bg-blue-600', hover: 'hover:bg-blue-700', text: 'text-blue-600', light: 'bg-blue-100', textDark: 'text-blue-700' },
  purple: { main: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-600', light: 'bg-purple-100', textDark: 'text-purple-700' },
  rose: { main: 'bg-rose-600', hover: 'hover:bg-rose-700', text: 'text-rose-600', light: 'bg-rose-100', textDark: 'text-rose-700' },
  orange: { main: 'bg-orange-600', hover: 'hover:bg-orange-700', text: 'text-orange-600', light: 'bg-orange-100', textDark: 'text-orange-700' },
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem('shweni_tawana_user');
  });
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [timeFilter, setTimeFilter] = useState('هەموو کات');
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  
  const [colorName, setColorName] = useState('emerald');
  const theme = THEMES[colorName];

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [savedReceipts, setSavedReceipts] = useState<SavedReceipt[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<number>(() => Date.now());
  const [loading, setLoading] = useState<boolean>(false);

  const fetchDataFromSupabase = async () => {
    if (!currentUser) return;
    setLoading(true);

    try {
      const { data: customerData, error: custError } = await supabase.from('customers').select('*');
      if (!custError && customerData) {
        setCustomers(customerData.map((c: any) => ({
          id: c.id, name: c.name || '', phone: c.phone || '', address: c.address || '',
          notes: c.notes || '', balance: c.balance || 0, date: c.date || new Date().toISOString(),
          debtReceipts: c.debt_receipts || []
        })));
      }

      const { data: cashData, error: cashError } = await supabase.from('cash_receipts').select('*');
      if (!cashError && cashData) {
        setSavedReceipts(cashData.map((r: any) => ({
          id: r.id, customerName: r.customer_name || '', phone: r.phone || '',
          date: r.date || new Date().toISOString(), totalAmount: r.total_amount || 0,
          type: 'cash', items: r.items || []
        })));
      }
    } catch (err) {
      console.error('Database fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchDataFromSupabase();
  }, [currentUser]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  if (!currentUser) {
    return <LoginScreen theme={theme} isDark={isDarkMode} setIsDark={setIsDark} onLogin={(username: string) => {
      localStorage.setItem('shweni_tawana_user', username);
      setCurrentUser(username);
    }} />;
  }

  const handleAutoSaveCash = async (receiptData: Omit<SavedReceipt, 'id'>) => {
    const receiptToSave = { id: currentDraftId, ...receiptData };
    setSavedReceipts(prev => {
      const exists = prev.find(r => r.id === currentDraftId);
      if (exists) return prev.map(r => r.id === currentDraftId ? receiptToSave : r);
      else return [...prev, receiptToSave];
    });

    await supabase.from('cash_receipts').upsert({
      id: currentDraftId, customer_name: receiptData.customerName, phone: receiptData.phone,
      date: receiptData.date, total_amount: receiptData.totalAmount, items: receiptData.items
    });
  };

  const startNewCashReceipt = () => setCurrentDraftId(Date.now());

  const handleAddCustomer = async (newCustomer: Customer) => {
    setCustomers(prev => [...prev, newCustomer]);
    await supabase.from('customers').insert({
      id: newCustomer.id, 
      name: newCustomer.name, 
      phone: newCustomer.phone,
      address: newCustomer.address, 
      notes: newCustomer.notes, 
      balance: newCustomer.balance,
      date: newCustomer.date, 
      debt_receipts: newCustomer.debtReceipts
    });
  };
  
  const handleDeleteSavedReceipt = async (id: number) => {
    if(window.confirm('دڵنیایت لە سڕینەوەی ئەم وەسڵە نەقدییە؟')) {
      setSavedReceipts(prev => prev.filter(r => r.id !== id));
      await supabase.from('cash_receipts').delete().eq('id', id);
    }
  };

  const handleEditSavedReceipt = async (updatedReceipt: SavedReceipt) => {
    setSavedReceipts(prev => prev.map(r => r.id === updatedReceipt.id ? updatedReceipt : r));
    await supabase.from('cash_receipts').update({
      customer_name: updatedReceipt.customerName, phone: updatedReceipt.phone,
      total_amount: updatedReceipt.totalAmount, items: updatedReceipt.items
    }).eq('id', updatedReceipt.id);
  };

  const handleEditCustomer = async (updatedCustomer: Customer) => {
    setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
    await supabase.from('customers').update({
      name: updatedCustomer.name, phone: updatedCustomer.phone, address: updatedCustomer.address,
      notes: updatedCustomer.notes, balance: updatedCustomer.balance, debt_receipts: updatedCustomer.debtReceipts
    }).eq('id', updatedCustomer.id);
  };
  
  const handleDeleteCustomer = async (id: number) => {
    if(window.confirm('دڵنیایت لە سڕینەوەی ئەم کڕیارە؟ هەموو قەرزەکانیشی دەسڕێتەوە!')){
      setCustomers(prev => prev.filter(c => c.id !== id));
      if (activeCustomer?.id === id) setActiveTab('customers');
      await supabase.from('customers').delete().eq('id', id);
    }
  };

  const handleUpdateCustomerLedger = async (customerId: number, newReceipts: CustomerReceipt[]) => {
    let total = 0;
    newReceipts.forEach(r => {
      r.items.forEach(i => { 
        const price = parseNumber(i.price);
        const qty = parseNumber(i.quantity);
        total += (i.type === 'payment' ? -price : qty * price); 
      });
    });

    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        const updated = { ...c, debtReceipts: newReceipts, balance: total };
        if (activeCustomer?.id === customerId) setActiveCustomer(updated);
        return updated;
      }
      return c;
    }));

    await supabase.from('customers').update({
      balance: total, debt_receipts: newReceipts
    }).eq('id', customerId);
  };

  const handleLogout = () => {
    localStorage.removeItem('shweni_tawana_user');
    setCurrentUser(null);
  };

  return (
    <div id="app-wrapper" className={`flex h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} text-right`} dir="rtl">
      
      {/* ستايلی تەواوی پرینت - چارەسەری ئوتۆماتیکی بۆ چاپکردن */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm;
          }
          
          body, html, #root, #app-wrapper, #content-wrapper, #main-content {
            background: white !important;
            color: black !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }

          .print-hide, aside, header, button, select {
            display: none !important;
          }

          .a4-page {
            width: 100% !important;
            max-width: 210mm !important;
            min-height: 285mm !important;
            margin: 0 auto !important;
            padding: 5mm 8mm !important;
            box-sizing: border-box !important;
            background: white !important;
            color: black !important;
            page-break-after: always;
            break-after: page;
            box-shadow: none !important;
            border: none !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }

          .a4-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          input, textarea {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            outline: none !important;
            appearance: none !important;
            color: black !important;
          }
        }
      `}</style>

      <aside className={`w-64 border-l flex flex-col transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} print-hide`}>
        <div className={`h-20 flex items-center justify-center border-b gap-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className={`${theme.main} p-2 rounded-lg text-white transition-colors`}><Building2 size={24} /></div>
          <div>
            <h1 className="text-xl font-bold">شوێنی توانا</h1>
            <p className={`text-xs ${theme.text} text-right font-bold transition-colors`}>ئەکاونت: {currentUser}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 flex flex-col">
          <SidebarItem icon={<LayoutDashboard size={20} />} label="داشبۆرد" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} isDark={isDarkMode} theme={theme} />
          <SidebarItem icon={<Users size={20} />} label="کڕیارەکان" isActive={activeTab === 'customers' || activeTab === 'customer-ledger'} onClick={() => setActiveTab('customers')} isDark={isDarkMode} theme={theme} />
          <SidebarItem icon={<ReceiptText size={20} />} label="وەسڵی نەقدی" isActive={activeTab === 'cash-receipt'} onClick={() => setActiveTab('cash-receipt')} isDark={isDarkMode} theme={theme} />
          
          <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
             <button type="button" onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 transition-colors">
               <LogOut size={20} /> <span>چوونەدەرەوە</span>
             </button>
             <div className="text-center mt-6 text-[11px] font-bold text-gray-400" dir="ltr">
               Designed and Developed by Eng. Masrour
             </div>
          </div>
        </nav>
      </aside>

      <div id="content-wrapper" className="flex-1 flex flex-col overflow-hidden">
        <header className={`h-16 border-b flex items-center justify-between px-8 transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} print-hide`}>
          <div className={`text-xl font-bold ${theme.text} transition-colors flex items-center gap-2`}>
            سیستەمی بەڕێوەبردن 
            {loading && <span className="text-xs bg-yellow-500 text-black px-2 py-1 rounded animate-pulse">لۆدکردن...</span>}
          </div>
          
          <div className="flex items-center gap-6">
            <div className={`flex gap-2 p-1.5 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              {Object.keys(THEMES).map(c => (
                <button key={c} type="button" onClick={() => setColorName(c)} 
                  className={`w-6 h-6 rounded-full ${THEMES[c].main} transition-all ${colorName === c ? 'ring-2 ring-offset-2 ' + (isDarkMode ? 'ring-gray-300 ring-offset-gray-800' : 'ring-gray-400') : 'opacity-70 hover:opacity-100'}`}
                  title="گۆڕینی ڕەنگ"
                ></button>
              ))}
            </div>

            <button type="button" onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
              {isDarkMode ? <Sun size={20} className="text-yellow-400"/> : <Moon size={20} className="text-gray-600"/>}
            </button>
          </div>
        </header>

        <main id="main-content" className={`flex-1 overflow-y-auto p-8 transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
          {activeTab === 'dashboard' && <DashboardView isDark={isDarkMode} timeFilter={timeFilter} setTimeFilter={setTimeFilter} customers={customers} savedReceipts={savedReceipts} onDeleteReceipt={handleDeleteSavedReceipt} onEditReceipt={handleEditSavedReceipt} theme={theme} />}
          {activeTab === 'customers' && <CustomersView isDark={isDarkMode} customers={customers} theme={theme} onAdd={handleAddCustomer} onEdit={handleEditCustomer} onDelete={handleDeleteCustomer} onOpenLedger={(c: Customer) => { setActiveCustomer(c); setActiveTab('customer-ledger'); }} />}
          {activeTab === 'customer-ledger' && activeCustomer && <CustomerLedgerView isDark={isDarkMode} customer={activeCustomer} theme={theme} onUpdateDebt={handleUpdateCustomerLedger} onBack={() => setActiveTab('customers')} />}
          {activeTab === 'cash-receipt' && <CashReceiptView isDark={isDarkMode} theme={theme} onAutoSave={handleAutoSaveCash} startNewReceipt={startNewCashReceipt} draftId={currentDraftId} />}
        </main>
      </div>
    </div>
  );
}

function LoginScreen({ theme, isDark, setIsDark, onLogin }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if ((username === 'zana1' && password === '123456') || 
        (username === 'zana2' && password === '123456') ||
        (username === 'masrour' && password === '123456')) {
      onLogin(username);
    } else {
      setErrorMsg('ناوی بەکارهێنەر یان پاسۆرد هەڵەیە!');
    }
  };

  return (
    <div className={`flex min-h-screen items-center justify-center p-4 transition-colors ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`} dir="rtl">
      <div className="absolute top-4 left-4">
        <button type="button" onClick={() => setIsDark(!isDark)} className={`p-2 rounded-full transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white shadow hover:bg-gray-50'}`}>
          {isDark ? <Sun size={24} className="text-yellow-400"/> : <Moon size={24} className="text-gray-600"/>}
        </button>
      </div>

      <div className={`w-full max-w-md p-8 rounded-3xl shadow-2xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="text-center mb-8">
          <div className={`inline-flex p-4 rounded-full mb-4 ${theme.light}`}>
            <Building2 size={40} className={theme.textDark} />
          </div>
          <h1 className="text-3xl font-black mb-2">بەخێربێیت</h1>
          <p className={`text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>سیستەمی بەڕێوەبردنی شوێنی توانا</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-100 text-red-700 font-bold text-center border border-red-200 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block mb-2 text-sm font-bold">ناوی بەکارهێنەر</label>
            <div className={`flex items-center p-3 rounded-xl border transition-colors ${isDark ? 'bg-gray-700 border-gray-600 focus-within:border-blue-500' : 'bg-gray-50 border-gray-300 focus-within:border-blue-500'}`}>
              <User size={20} className="text-gray-400 ml-3" />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-transparent outline-none font-medium text-left" 
                placeholder=""
                dir="ltr"
                required
              />
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-bold">تێپەڕوشە (پاسۆرد)</label>
            <div className={`flex items-center p-3 rounded-xl border transition-colors ${isDark ? 'bg-gray-700 border-gray-600 focus-within:border-blue-500' : 'bg-gray-50 border-gray-300 focus-within:border-blue-500'}`}>
              <Lock size={20} className="text-gray-400 ml-3" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent outline-none font-medium text-left tracking-widest" 
                placeholder=""
                dir="ltr"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 ${theme.main} ${theme.hover}`}
          >
            چوونە ژوورەوە
          </button>
        </form>
        <div className="text-center mt-6 text-xs font-bold text-gray-400" dir="ltr">
          Designed and Developed by Eng. Masrour
        </div>
      </div>
    </div>
  );
}

function DashboardView({ isDark, timeFilter, setTimeFilter, customers, savedReceipts, onDeleteReceipt, onEditReceipt, theme }: any) {
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<SavedReceipt | null>(null);
  const [receiptSearch, setReceiptSearch] = useState('');
  const [editingReceipt, setEditingReceipt] = useState<SavedReceipt | null>(null);

  const filterByTime = (dateString: string) => {
    if (timeFilter === 'هەموو کات') return true;
    const diffDays = Math.ceil(Math.abs(new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    if (timeFilter === 'ئەمڕۆ') return diffDays <= 1;
    if (timeFilter === 'ئەم هەفتەیە') return diffDays <= 7;
    if (timeFilter === 'ئەم مانگە') return diffDays <= 30;
    if (timeFilter === 'ئەم ساڵە') return diffDays <= 365;
    return true;
  };

  const filteredCustomers = customers.filter((c: any) => filterByTime(c.date));
  const filteredReceipts = savedReceipts.filter((r: any) => filterByTime(r.date));

  const allPayments: any[] = [];
  customers.forEach((c: Customer) => {
    c.debtReceipts.forEach(r => {
      r.items.forEach(i => {
        if (i.type === 'payment' && filterByTime(r.date)) {
          allPayments.push({
            customerName: c.name,
            phone: c.phone,
            amount: parseNumber(i.price),
            receiver: i.note,
            date: r.date,
            dateStr: i.dateStr,
            timeStr: i.timeStr
          });
        }
      });
    });
  });

  const totalPaymentsCollected = allPayments.reduce((sum, p) => sum + p.amount, 0);

  const searchedReceipts = filteredReceipts.filter((r: any) => 
    (r.customerName && r.customerName.includes(receiptSearch)) || 
    (r.phone && r.phone.includes(receiptSearch))
  );

  const totalDebt = filteredCustomers.reduce((sum: number, c: any) => sum + c.balance, 0);
  const totalCashSales = filteredReceipts.reduce((sum: number, r: any) => sum + r.totalAmount, 0);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex justify-between items-center print-hide">
        <div><h2 className="text-3xl font-bold mb-2">داشبۆرد</h2><p className={isDark ? 'text-gray-400' : 'text-gray-500'}>پوختەیەکی گشتی بەپێی کاتی دیاریکراو</p></div>
        <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className={`px-4 py-2 rounded-lg font-bold outline-none cursor-pointer ${isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white border-gray-200 border shadow-sm'}`}>
          <option>ئەمڕۆ</option><option>ئەم هەفتەیە</option><option>ئەم مانگە</option><option>ئەم ساڵە</option><option>هەموو کات</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 print-hide">
        <DashboardCard title="کۆی قەرزەکانمان" amount={totalDebt.toLocaleString()} suffix="د.ع" icon={ReceiptText} isDark={isDark} />
        
        <div onClick={() => setShowPaymentsModal(true)} className={`cursor-pointer hover:scale-105 transform transition-all duration-200 p-6 rounded-xl border flex flex-col items-center justify-center gap-4 ${isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 shadow-sm hover:shadow-md'}`}>
          <div className={isDark ? 'bg-gray-700 p-3 rounded-2xl' : 'bg-gray-50 p-3 rounded-2xl'}><BookOpen className="text-blue-500" size={24} /></div>
          <div className="text-center">
             <div className="text-2xl font-black flex items-center justify-center gap-1"><span>{totalPaymentsCollected.toLocaleString()}</span><span className="text-sm font-bold text-gray-400">د.ع</span></div>
             <div className={`text-sm mt-1 font-bold flex items-center justify-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>قەرزی وەرگیراوە (واصڵ) <FileText size={14}/></div>
          </div>
        </div>

        <div onClick={() => setShowReceiptModal(true)} className={`cursor-pointer hover:scale-105 transform transition-all duration-200 p-6 rounded-xl border flex flex-col items-center justify-center gap-4 ${isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 shadow-sm hover:shadow-md'}`}>
          <div className={isDark ? 'bg-gray-700 p-3 rounded-2xl' : 'bg-gray-50 p-3 rounded-2xl'}><Building2 className={theme.text} size={24} /></div>
          <div className="text-center">
             <div className="text-2xl font-black flex items-center justify-center gap-1"><span>{totalCashSales.toLocaleString()}</span><span className="text-sm font-bold text-gray-400">د.ع</span></div>
             <div className={`text-sm mt-1 font-bold flex items-center justify-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>فرۆشتنی نەقدی <FileText size={14}/></div>
          </div>
        </div>
        
        <DashboardCard title="کۆی کڕیارەکان" amount={filteredCustomers.length} suffix="کەس" icon={Users} isDark={isDark} />
      </div>

      {showPaymentsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 print-hide">
          <div className={`w-[90%] max-w-4xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl shadow-2xl ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-black'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">لێستی قەرزی وەرگیراوەکان (واصڵ)</h2>
              <button type="button" onClick={() => setShowPaymentsModal(false)} className="text-red-500 hover:text-red-700 bg-red-100 p-2 rounded-lg"><X size={24}/></button>
            </div>
            
            <div className="space-y-3">
              {allPayments.map((p, idx) => (
                <div key={idx} className={`p-4 rounded-xl border flex justify-between items-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div>
                    <p className="font-bold text-lg text-emerald-600">{p.customerName}</p>
                    <p className="text-sm text-gray-500">وەرگر: <span className="font-bold text-blue-700">{p.receiver}</span> - مۆبایل: <span dir="ltr">{p.phone}</span></p>
                    <p className="text-xs text-gray-400 mt-1">{p.dateStr || new Date(p.date).toLocaleDateString('en-IQ')} ({p.timeStr || '---'})</p>
                  </div>
                  <div className="text-left">
                    <p className="font-black text-2xl text-emerald-600" dir="ltr">- {p.amount.toLocaleString()} د.ع</p>
                  </div>
                </div>
              ))}
              {allPayments.length === 0 && <p className="text-center p-10 text-gray-500">هیچ پارەیەک واصڵ نەکراوە لەم کاتەدا.</p>}
            </div>
          </div>
        </div>
      )}

      {showReceiptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 print:static print:p-0 print:bg-transparent">
          <div className={`w-[90%] max-w-5xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl shadow-2xl print:w-full print:max-w-none print:max-h-none print:overflow-visible print:p-0 print:shadow-none print:rounded-none print:bg-transparent ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-black'}`}>
            <div className="flex justify-between items-center mb-6 print-hide">
              <h2 className="text-2xl font-bold">ئەرشیفی وەسڵە نەقدییەکان</h2>
              <button type="button" onClick={() => {setShowReceiptModal(false); setSelectedReceipt(null); setReceiptSearch('');}} className="text-red-500 hover:text-red-700 bg-red-100 p-2 rounded-lg"><X size={24}/></button>
            </div>
            {!selectedReceipt ? (
              <div className="print-hide">
                <div className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300 shadow-sm'}`}>
                  <Search className="text-gray-400" size={20}/>
                  <input type="text" placeholder="گەڕان بەپێی ناوی کڕیار یان مۆبایل..." className={`w-full bg-transparent outline-none font-medium ${isDark ? 'text-white' : 'text-black'}`} value={receiptSearch} onChange={(e) => setReceiptSearch(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchedReceipts.map((receipt: SavedReceipt) => (
                    <div key={receipt.id} className={`p-4 rounded-xl border flex justify-between items-center transition-all ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                      <div className="cursor-pointer flex-1" onClick={() => setSelectedReceipt(receipt)}>
                        <p className="font-bold text-lg">{receipt.customerName || 'کڕیاری نەناسراو'}</p>
                        <p className="text-sm text-gray-500">{new Date(receipt.date).toLocaleDateString('en-IQ')} - <span dir="ltr">{receipt.phone}</span></p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-left cursor-pointer" onClick={() => setSelectedReceipt(receipt)}>
                          <p className={`font-black text-xl ${theme.text}`}>{receipt.totalAmount.toLocaleString()} د.ع</p>
                        </div>
                        <button type="button" onClick={() => setEditingReceipt(receipt)} className={`p-2 hover:${theme.text}`} title="دەستکاری کردن"><Edit size={20}/></button>
                        <button type="button" onClick={() => onDeleteReceipt(receipt.id)} className="text-red-500 hover:text-red-700 p-2" title="سڕینەوەی وەسڵ"><Trash2 size={20}/></button>
                      </div>
                    </div>
                  ))}
                  {searchedReceipts.length === 0 && <p className="text-center col-span-2 p-10 text-gray-500">هیچ وەسڵێک نەدۆزرایەوە.</p>}
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4 flex gap-4 print-hide">
                  <button type="button" onClick={() => setSelectedReceipt(null)} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-bold">گەڕانەوە بۆ لیست</button>
                  <button type="button" onClick={() => window.print()} className={`${theme.main} ${theme.hover} text-white px-4 py-2 rounded-lg font-bold flex gap-2`}><Printer size={20}/> چاپکردن / PDF</button>
                </div>
                <StaticReceiptTemplate receipt={selectedReceipt} theme={theme} />
              </div>
            )}
          </div>
        </div>
      )}

      {editingReceipt && (
        <EditReceiptModal 
          receipt={editingReceipt} 
          isDark={isDark} 
          theme={theme} 
          onClose={() => setEditingReceipt(null)} 
          onSave={(updated: SavedReceipt) => {
            onEditReceipt(updated);
            setEditingReceipt(null);
            if (selectedReceipt?.id === updated.id) setSelectedReceipt(updated);
          }} 
        />
      )}
    </div>
  );
}

function EditReceiptModal({ receipt, isDark, theme, onClose, onSave }: any) {
  const [customerName, setCustomerName] = useState(receipt.customerName);
  const [phone, setPhone] = useState(receipt.phone);
  const [items, setItems] = useState<ReceiptItem[]>(receipt.items?.length > 0 ? receipt.items : [{ id: 1, name: '', quantity: '', unit: 'دانە', price: '', isNew: true, type: 'item', note: '' }]);

  let totalItemsCost = 0;
  items.forEach(item => {
    const price = parseNumber(item.price);
    const qty = parseNumber(item.quantity);
    if (item.type !== 'payment') totalItemsCost += qty * price;
    else totalItemsCost -= price;
  });

  const updateItem = (id: number, field: string, value: any) => {
    let processedVal = value;
    if (field === 'quantity' || field === 'price') {
      processedVal = convertToEnglishDigits(value);
    }
    setItems(items.map(i => i.id === id ? { ...i, [field]: processedVal } : i));
  };

  const addItem = () => {
    const dateStr = new Date().toLocaleDateString('en-GB');
    const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setItems([...items, { id: Date.now(), name: '', quantity: '', unit: 'دانە', price: '', isNew: true, type: 'item', note: '', dateStr, timeStr }]);
  };

  const removeItem = (id: number) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...receipt,
      customerName,
      phone: convertToEnglishDigits(phone),
      totalAmount: totalItemsCost,
      items
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 print-hide">
      <div className={`w-[90%] max-w-4xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl shadow-2xl ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">دەستکاریکردنی وەسڵ</h2>
          <button type="button" onClick={onClose} className="text-red-500 hover:text-red-700 bg-red-100 p-2 rounded-lg"><X size={24}/></button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 font-bold text-sm">ناوی کڕیار</label>
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className={`w-full p-3 rounded-lg border outline-none font-bold ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`} />
            </div>
            <div>
              <label className="block mb-2 font-bold text-sm">ژمارەی مۆبایل</label>
              <input type="text" value={phone} onChange={e => setPhone(convertToEnglishDigits(e.target.value))} className={`w-full p-3 rounded-lg border outline-none font-bold text-right ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`} dir="ltr" />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="font-bold text-sm">کاڵاکان</label>
              <button type="button" onClick={addItem} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded font-bold text-sm flex items-center gap-1"><Plus size={16}/> زیادکردنی کاڵا</button>
            </div>
            <table className="w-full border-collapse border border-gray-400 text-center text-sm">
              <thead>
                <tr className="bg-gray-200 text-black">
                  <th className="border p-2">ناو</th>
                  <th className="border p-2 w-16">بڕ</th>
                  <th className="border p-2 w-20">یەکە</th>
                  <th className="border p-2 w-24">نرخ</th>
                  <th className="border p-2 w-28">کۆی گشتی</th>
                  <th className="border p-2 w-10">❌</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: ReceiptItem) => {
                  const qty = parseNumber(item.quantity);
                  const price = parseNumber(item.price);
                  const lineTotal = item.type === 'payment' ? price : qty * price;
                  return (
                    <tr key={item.id}>
                      <td className="border p-1"><input type="text" value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} className="w-full p-1 bg-transparent outline-none font-bold text-right" /></td>
                      <td className="border p-1"><input type="text" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} className="w-full p-1 bg-transparent outline-none font-bold text-center" /></td>
                      <td className="border p-1">
                        <select value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)} className="w-full bg-transparent outline-none text-center">
                          <option>دانە</option><option>مەتر</option><option>کیلۆ</option><option>کارتۆن</option><option>دەرزەن</option><option>قوتوو</option>
                        </select>
                      </td>
                      <td className="border p-1"><input type="text" value={item.price} onChange={e => updateItem(item.id, 'price', e.target.value)} className="w-full p-1 bg-transparent outline-none font-bold text-center" /></td>
                      <td className="border p-1 font-black" dir="ltr">{lineTotal.toLocaleString()}</td>
                      <td className="border p-1"><button type="button" onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-bold">پەشیمانبوونەوە</button>
            <button type="submit" className={`${theme.main} ${theme.hover} text-white px-6 py-2 rounded-lg font-bold`}>پاشەکەوتکردن</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomersView({ isDark, customers, theme, onAdd, onEdit, onDelete, onOpenLedger }: any) {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '', notes: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const filteredCustomers = customers.filter((c: any) => c.name.includes(search) || c.phone.includes(search));

  const openAddModal = () => { setEditingCustomer(null); setFormData({ name: '', phone: '', address: '', notes: '' }); setErrorMsg(''); setShowModal(true); };
  const openEditModal = (customer: Customer) => { setEditingCustomer(customer); setFormData({ name: customer.name, phone: customer.phone, address: customer.address, notes: customer.notes }); setErrorMsg(''); setShowModal(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.name || formData.name.trim() === '') { 
      setErrorMsg('تکایە ناوی کڕیارەکە بنووسە!'); 
      return; 
    }
    
    const cleanedPhone = convertToEnglishDigits(formData.phone);
    const dateStr = new Date().toLocaleDateString('en-GB');
    const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    if (editingCustomer) {
      onEdit({ ...editingCustomer, ...formData, phone: cleanedPhone });
    } else {
      onAdd({ 
        id: Date.now(), 
        name: formData.name, 
        phone: cleanedPhone, 
        address: formData.address, 
        notes: formData.notes, 
        balance: 0, 
        date: new Date().toISOString(), 
        debtReceipts: [{ id: Date.now(), date: new Date().toISOString(), items: [{ id: Date.now(), name: '', quantity: '', unit: 'دانە', price: '', isNew: true, type: 'item', note: '', dateStr, timeStr }] }] 
      });
    }
    setShowModal(false);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div><h2 className="text-3xl font-bold mb-1">کڕیارەکان</h2><p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>کۆی کڕیارەکان: {customers.length}</p></div>
        <button type="button" onClick={openAddModal} className={`${theme.main} ${theme.hover} text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md transition-colors`}><Plus size={20}/> زیادکردنی قەرزدار</button>
      </div>

      <div className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
        <Search className="text-gray-400" size={20}/>
        <input type="text" placeholder="گەڕان بەپێی ناو یان مۆبایل..." className={`w-full bg-transparent outline-none font-medium ${isDark ? 'text-white' : 'text-black'}`} value={search} onChange={(e) => setSearch(convertToEnglishDigits(e.target.value))} />
      </div>

      <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
        <table className="w-full text-right">
          <thead className={isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'}>
            <tr><th className="p-4 font-bold">ناو</th><th className="p-4 font-bold">ژمارەی مۆبایل</th><th className="p-4 font-bold">باڵانس (قەرز)</th><th className="p-4 font-bold">کردارەکان</th></tr>
          </thead>
          <tbody>
            {filteredCustomers.map((customer: Customer) => (
              <tr key={customer.id} className={`border-t transition-colors ${isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'}`}>
                <td className={`p-4 font-bold cursor-pointer transition-colors hover:${theme.text}`} onClick={() => onOpenLedger(customer)}>{customer.name}</td>
                <td className="p-4 cursor-pointer text-left" onClick={() => onOpenLedger(customer)}><span dir="ltr" style={{ unicodeBidi: 'plaintext' }}>{customer.phone || '---'}</span></td>
                <td className="p-4 font-bold text-red-500 cursor-pointer" onClick={() => onOpenLedger(customer)}>{customer.balance.toLocaleString()} د.ع</td>
                <td className="p-4 flex gap-4 text-gray-400">
                  <button type="button" onClick={() => onOpenLedger(customer)} className="hover:text-blue-500 transition-colors" title="دەفتەری قەرز"><BookOpen size={20}/></button>
                  <button type="button" onClick={() => openEditModal(customer)} className={`hover:${theme.text} transition-colors`} title="دەستکاریکردن"><Edit size={20}/></button>
                  <button type="button" onClick={() => onDelete(customer.id)} className="hover:text-red-500 transition-colors" title="سڕینەوە"><Trash2 size={20}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 print-hide">
          <div className={`w-[500px] p-6 rounded-2xl shadow-xl ${isDark ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>
            <div className="flex justify-between items-center mb-6">
              <button type="button" onClick={() => setShowModal(false)} className="text-red-500 hover:text-red-700"><X size={24}/></button>
              <h2 className="text-2xl font-bold">{editingCustomer ? 'دەستکاریکردنی کڕیار' : 'زیادکردنی کڕیار'}</h2>
            </div>
            {errorMsg && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 font-bold">{errorMsg}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-2 font-bold text-sm">ناو *</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData(prev => ({...prev, name: e.target.value}))} 
                  className={`w-full p-3 rounded-lg border outline-none transition-colors ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-black'}`} 
                />
              </div>
              <div>
                <label className="block mb-2 font-bold text-sm">ژمارەی مۆبایل</label>
                <input 
                  type="text" 
                  value={formData.phone} 
                  onChange={e => setFormData(prev => ({...prev, phone: convertToEnglishDigits(e.target.value)}))} 
                  className={`w-full p-3 text-right rounded-lg border outline-none transition-colors ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-black'}`} 
                  placeholder="0750 000 0000"
                  dir="ltr"
                  style={{ unicodeBidi: 'plaintext', textAlign: 'right' }}
                />
              </div>
              <div>
                <label className="block mb-2 font-bold text-sm">ناونیشان</label>
                <input 
                  type="text" 
                  value={formData.address} 
                  onChange={e => setFormData(prev => ({...prev, address: e.target.value}))} 
                  className={`w-full p-3 rounded-lg border outline-none transition-colors ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-black'}`} 
                />
              </div>
              <div>
                <label className="block mb-2 font-bold text-sm">تێبینی</label>
                <textarea 
                  value={formData.notes} 
                  onChange={e => setFormData(prev => ({...prev, notes: e.target.value}))} 
                  className={`w-full p-3 rounded-lg border outline-none transition-colors ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-black'}`} 
                  rows={3}
                ></textarea>
              </div>

              <div className="flex gap-4 mt-8">
                <button type="submit" className={`flex-1 ${theme.main} ${theme.hover} text-white font-bold py-3 rounded-lg transition-colors`}>پاشەکەوتکردن</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerLedgerView({ customer, theme, onUpdateDebt, onBack }: any) {
  const [receipts, setReceipts] = useState<CustomerReceipt[]>(() => {
    if (customer.debtReceipts?.length > 0) {
      return customer.debtReceipts.map((r: CustomerReceipt) => {
        if (r.items.length === 0) {
          const dateStr = new Date().toLocaleDateString('en-GB');
          const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          return { ...r, items: [{ id: Date.now(), name: '', quantity: '', unit: 'دانە', price: '', isNew: true, type: 'item', note: '', dateStr, timeStr }] };
        }
        return r;
      });
    } else {
      const dateStr = new Date().toLocaleDateString('en-GB');
      const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      return [{ id: Date.now(), date: new Date().toISOString(), items: [{ id: Date.now(), name: '', quantity: '', unit: 'دانە', price: '', isNew: true, type: 'item', note: '', dateStr, timeStr }] }];
    }
  });

  useEffect(() => {
    onUpdateDebt(customer.id, receipts);
  }, [receipts]);

  const addNewReceiptBlock = () => {
    const dateStr = new Date().toLocaleDateString('en-GB');
    const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setReceipts([...receipts, { id: Date.now(), date: new Date().toISOString(), items: [{ id: Date.now(), name: '', quantity: '', unit: 'دانە', price: '', isNew: true, type: 'item', note: '', dateStr, timeStr }] }]);
  };

  const deleteReceiptBlock = (id: number) => {
    if(window.confirm('دڵنیایت لە سڕینەوەی تەواوی ئەم وەسڵە؟')) {
      let filtered = receipts.filter(r => r.id !== id);
      if(filtered.length === 0) {
        const dateStr = new Date().toLocaleDateString('en-GB');
        const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        filtered = [{ id: Date.now(), date: new Date().toISOString(), items: [{ id: Date.now(), name: '', quantity: '', unit: 'دانە', price: '', isNew: true, type: 'item', note: '', dateStr, timeStr }] }];
      }
      setReceipts(filtered);
    }
  };

  const updateReceiptDate = (id: number, newDate: string) => {
    setReceipts(receipts.map(r => r.id === id ? { ...r, date: newDate } : r));
  };

  const addItem = (receiptId: number) => {
    const dateStr = new Date().toLocaleDateString('en-GB');
    const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setReceipts(receipts.map(r => r.id === receiptId ? { ...r, items: [...r.items, { id: Date.now(), name: '', quantity: '', unit: 'دانە', price: '', isNew: true, type: 'item', note: '', dateStr, timeStr }] } : r));
  };
  
  const addPayment = (receiptId: number) => {
    const dateStr = new Date().toLocaleDateString('en-GB');
    const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setReceipts(receipts.map(r => r.id === receiptId ? { ...r, items: [...r.items, { id: Date.now(), name: 'پارەدان', quantity: '', unit: '-', price: '', isNew: true, type: 'payment', note: 'زیاد کریم', dateStr, timeStr }] } : r));
  };

  const updateItem = (receiptId: number, itemId: number, field: string, value: any) => {
    let processedVal = value;
    if (field === 'quantity' || field === 'price') {
      processedVal = convertToEnglishDigits(value);
    }
    setReceipts(receipts.map(r => {
      if (r.id === receiptId) {
        return {
          ...r,
          items: r.items.map(i => i.id === itemId ? { ...i, [field]: processedVal } : i)
        };
      }
      return r;
    }));
  };

  const removeItem = (receiptId: number, itemId: number) => {
    setReceipts(receipts.map(r => {
      if (r.id === receiptId) {
        const filtered = r.items.filter(i => i.id !== itemId);
        if (filtered.length === 0) {
          const dateStr = new Date().toLocaleDateString('en-GB');
          const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          return { ...r, items: [{ id: Date.now(), name: '', quantity: '', unit: 'دانە', price: '', isNew: true, type: 'item', note: '', dateStr, timeStr }] };
        }
        return { ...r, items: filtered };
      }
      return r;
    }));
  };

  let runningTotalDebt = 0;

  return (
    <div className="w-full pb-20">
      <div className="max-w-[210mm] mx-auto flex justify-between items-center mb-6 print-hide sticky top-0 bg-gray-100 dark:bg-gray-900 z-10 py-4 border-b border-gray-300 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onBack} className="bg-gray-300 hover:bg-gray-400 text-gray-800 p-2 rounded-lg font-bold transition-colors"><ArrowRight size={24}/></button>
          <h2 className="text-2xl font-bold text-red-600">دەفتەری قەرزی ({customer.name})</h2>
        </div>
        <div className="flex gap-4">
          <button type="button" onClick={addNewReceiptBlock} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md"><Plus size={20}/> وەسڵی نوێ</button>
          <button type="button" onClick={() => window.print()} className={`${theme.main} ${theme.hover} text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md`}><Printer size={20}/> چاپکردن / PDF</button>
        </div>
      </div>

      {receipts.map((receipt) => {
        const prevDebt = runningTotalDebt;
        
        let totalItemsCost = 0;
        let totalPaymentsMade = 0;
        
        receipt.items.forEach(item => {
          const price = parseNumber(item.price);
          const qty = parseNumber(item.quantity);
          if (item.type === 'payment') {
            totalPaymentsMade += price;
          } else {
            totalItemsCost += qty * price;
          }
        });

        const currentReceiptTotal = totalItemsCost - totalPaymentsMade;
        runningTotalDebt += currentReceiptTotal;
        const currentRemaining = runningTotalDebt;

        const ITEMS_PER_PAGE = 15;
        const totalPages = Math.ceil(receipt.items.length / ITEMS_PER_PAGE) || 1;
        
        const pagesArray = [];
        for (let p = 0; p < totalPages; p++) {
          const startIdx = p * ITEMS_PER_PAGE;
          pagesArray.push({ pageNum: p + 1, items: receipt.items.slice(startIdx, startIdx + ITEMS_PER_PAGE) });
        }

        return (
          <div key={receipt.id} className="mb-12">
            
            <div className="max-w-[210mm] mx-auto flex justify-between items-center bg-gray-300 dark:bg-gray-700 p-3 rounded-t-lg border border-b-0 border-gray-400 print-hide">
              <div className="flex items-center gap-3">
                <span className="font-bold dark:text-white">بەرواری وەسڵ:</span>
                <input type="date" value={receipt.date ? receipt.date.split('T')[0] : ''} onChange={(e) => updateReceiptDate(receipt.id, new Date(e.target.value).toISOString())} className="p-1 rounded font-bold outline-none text-black" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => addPayment(receipt.id)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded font-bold flex items-center gap-1 text-sm"><MinusCircle size={16}/> پارەدان</button>
                <button type="button" onClick={() => deleteReceiptBlock(receipt.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded font-bold flex items-center gap-1 text-sm"><Trash2 size={16}/> سڕینەوە</button>
              </div>
            </div>

            {pagesArray.map((pageObj, pIndex) => {
              const isLastPage = pIndex === totalPages - 1;

              return (
                <div key={pIndex} className="a4-page shadow-lg mx-auto flex flex-col justify-between mb-8">
                  <div>
                    <div className="text-center mb-6 border-b-2 border-black pb-4">
                      <h1 className={`text-3xl font-black ${theme.text} mb-2`}>توانا</h1>
                      <p className="font-bold text-sm mb-1">بۆ بازرگانی گشتی کەل و پەلی دەستی و کەرەستەی بیناسازی</p>
                      <p className="font-medium text-xs mb-1">ناونیشان: کۆرێ شەقامی گشتی تەنیشت بەنزینخانەی ئەفرین</p>
                      <p className="font-bold text-sm mt-2" dir="ltr">0750 497 8758 - 0750 017 2002</p>
                    </div>

                    <div className="flex justify-between mb-6 font-bold text-base px-2">
                      <div className="flex flex-col gap-2 w-1/2">
                        <p>ناوی کڕیار: <span className="mr-2 text-lg font-black border-b-2 border-black pb-0.5 px-3">{customer.name}</span></p>
                        <p>مۆبایل: <span className="mr-2 text-lg font-black border-b-2 border-black pb-0.5 px-3"><span dir="ltr" style={{ unicodeBidi: 'plaintext' }}>{customer.phone || '---'}</span></span></p>
                      </div>
                      <div className="text-left flex flex-col gap-1">
                        <p>بەروار: {receipt.date ? new Date(receipt.date).toLocaleDateString('en-IQ') : ''}</p>
                        <p>جۆری وەسڵ: <span className="text-red-700">قەرز (پەڕەی {pageObj.pageNum} لە {totalPages})</span></p>
                      </div>
                    </div>

                    <table className="w-full border-collapse border-2 border-black text-center mt-2">
                      <thead>
                        <tr className="bg-gray-200 text-xs">
                          <th className="border-2 border-black p-1 w-6">#</th>
                          <th className="border-2 border-black p-1 text-right w-1/3">ناوی کاڵا / جۆری پارەدان</th>
                          <th className="border-2 border-black p-1 w-10">بڕ</th>
                          <th className="border-2 border-black p-1 w-14">یەکە</th>
                          <th className="border-2 border-black p-1 w-20">نرخ / پارە</th>
                          <th className="border-2 border-black p-1 w-24">کۆی گشتی</th>
                          <th className="border-2 border-black p-1 w-16">بەروار/کات</th>
                          <th className="border-2 border-black p-1 w-16">تێبینی</th>
                          <th className="border-2 border-black p-1 w-6 print-hide">🗑️</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageObj.items.map((item, localIdx) => {
                          const globalIdx = (pIndex * ITEMS_PER_PAGE) + localIdx;
                          const priceNum = parseNumber(item.price);
                          const qtyNum = parseNumber(item.quantity);
                          const lineTotal = item.type === 'payment' ? -priceNum : qtyNum * priceNum;

                          return (
                            <tr key={item.id} className={`${item.type === 'payment' ? 'bg-green-50' : 'bg-white'} text-xs`}>
                              <td className="border-2 border-black p-0.5 font-bold">{globalIdx + 1}</td>
                              
                              <td className="border-2 border-black p-0.5">
                                <input 
                                  type="text" 
                                  value={item.name} 
                                  onChange={(e) => updateItem(receipt.id, item.id, 'name', e.target.value)} 
                                  onKeyDown={(e) => { 
                                    if (e.key === 'Enter') { 
                                      e.preventDefault(); 
                                      const nextInput = document.getElementById(`qty-${receipt.id}-${item.id}`);
                                      if (nextInput) nextInput.focus();
                                    } 
                                  }}
                                  className={`w-full text-right p-1 bg-transparent outline-none font-bold text-xs ${item.type === 'payment' ? 'text-green-700' : ''}`} 
                                  placeholder="ناو..." 
                                />
                              </td>
                              
                              <td className="border-2 border-black p-0.5">
                                {item.type === 'payment' ? (
                                  <input 
                                    id={`qty-${receipt.id}-${item.id}`}
                                    type="text" 
                                    value={item.quantity} 
                                    onChange={(e) => updateItem(receipt.id, item.id, 'quantity', e.target.value)} 
                                    onKeyDown={(e) => { 
                                      if (e.key === 'Enter') { 
                                        e.preventDefault(); 
                                        const nextInput = document.getElementById(`price-${receipt.id}-${item.id}`);
                                        if (nextInput) nextInput.focus();
                                      } 
                                    }}
                                    className="w-full text-center p-1 bg-transparent outline-none font-bold text-xs" 
                                    placeholder="بڕی پارە" 
                                  />
                                ) : (
                                  <input 
                                    id={`qty-${receipt.id}-${item.id}`}
                                    type="text" 
                                    value={item.quantity} 
                                    onChange={(e) => updateItem(receipt.id, item.id, 'quantity', e.target.value)} 
                                    onKeyDown={(e) => { 
                                      if (e.key === 'Enter') { 
                                        e.preventDefault(); 
                                        const nextInput = document.getElementById(`price-${receipt.id}-${item.id}`);
                                        if (nextInput) nextInput.focus();
                                      } 
                                    }}
                                    className="w-full text-center p-1 bg-transparent outline-none font-bold text-xs" 
                                  />
                                )}
                              </td>
                              
                              <td className="border-2 border-black p-0.5">
                                {item.type === 'payment' ? <span className="text-gray-400 font-bold">-</span> : (
                                  <select value={item.unit} onChange={(e) => updateItem(receipt.id, item.id, 'unit', e.target.value)} className="w-full text-center bg-transparent outline-none font-bold text-[10px] print:appearance-none">
                                    <option>دانە</option><option>مەتر</option><option>کیلۆ</option><option>کارتۆن</option><option>دەرزەن</option><option>قوتوو</option>
                                  </select>
                                )}
                              </td>
                              
                              <td className="border-2 border-black p-0.5">
                                <input 
                                  id={`price-${receipt.id}-${item.id}`}
                                  type="text" 
                                  value={item.price} 
                                  onChange={(e) => updateItem(receipt.id, item.id, 'price', e.target.value)} 
                                  onKeyDown={(e) => { 
                                    if (e.key === 'Enter') { 
                                      e.preventDefault(); 
                                      const nextInput = document.getElementById(`note-${receipt.id}-${item.id}`);
                                      if (nextInput) nextInput.focus();
                                    } 
                                  }}
                                  className="w-full text-center p-1 bg-transparent outline-none font-bold text-xs" 
                                  placeholder={item.type === 'payment' ? 'بڕی پارە' : ''} 
                                />
                              </td>
                              
                              <td className={`border-2 border-black p-0.5 font-black text-xs ${item.type === 'payment' ? 'text-green-600' : 'text-red-600'}`} dir="ltr">
                                {item.type === 'payment' ? `- ${Math.abs(lineTotal).toLocaleString()}` : lineTotal.toLocaleString()}
                              </td>

                              <td className="border-2 border-black p-0.5 text-[9px] font-bold text-gray-700 leading-tight">
                                <div dir="ltr">{item.dateStr || '26/07/2026'}</div>
                                <div dir="ltr" className="text-gray-500">{item.timeStr || '12:30'}</div>
                              </td>
                              
                              <td className="border-2 border-black p-0.5">
                                {item.type === 'payment' ? (
                                   <select 
                                     id={`note-${receipt.id}-${item.id}`}
                                     value={item.note || 'زیاد کریم'} 
                                     onChange={(e) => updateItem(receipt.id, item.id, 'note', e.target.value)} 
                                     onKeyDown={(e) => { 
                                       if (e.key === 'Enter') { 
                                         e.preventDefault(); 
                                         addItem(receipt.id); 
                                       } 
                                     }}
                                     className="w-full text-center bg-transparent outline-none font-bold text-[10px] text-blue-700 print:appearance-none"
                                   >
                                     <option value="زیاد کریم">زیاد کریم</option>
                                     <option value="زانا زیاد">زانا زیاد</option>
                                     <option value="شاگرد">شاگرد</option>
                                   </select>
                                ) : (
                                   <input 
                                     id={`note-${receipt.id}-${item.id}`}
                                     type="text" 
                                     value={item.note || ''} 
                                     onChange={(e) => updateItem(receipt.id, item.id, 'note', e.target.value)} 
                                     onKeyDown={(e) => { 
                                       if (e.key === 'Enter') { 
                                         e.preventDefault(); 
                                         addItem(receipt.id); 
                                       } 
                                     }}
                                     className="w-full text-right p-1 bg-transparent outline-none font-normal text-[10px] text-black" 
                                     placeholder="تێبینی..." 
                                   />
                                )}
                              </td>

                              <td className="border-2 border-black p-0.5 print-hide">
                                <button type="button" onClick={() => removeItem(receipt.id, item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-auto">

                    <div className="flex justify-between items-end mt-4">
                      {isLastPage ? (
                        <>
                          <div className="flex gap-16 text-base font-bold">
                            <div className="text-center"><p>ئیمزای کڕیار</p><div className="mt-8 border-b-2 border-dotted border-black w-32"></div></div>
                            <div className="text-center"><p>مۆر و ئیمزای فرۆشیار</p><div className="mt-8 border-b-2 border-dotted border-black w-32"></div></div>
                          </div>
                          
                          <div className="border-4 border-black p-4 w-72 text-center bg-gray-100">
                            <div className="flex justify-between font-bold text-sm mb-1 text-gray-700">
                              <span>قەرزی پێشوو:</span>
                              <span dir="ltr">{prevDebt.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-bold text-sm mb-1 text-blue-800">
                              <span>کۆی کاڵاکان:</span>
                              <span dir="ltr">{totalItemsCost.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-black text-sm mb-2 text-green-600">
                              <span>پارەی دراو (واصڵ):</span>
                              <span dir="ltr">- {totalPaymentsMade.toLocaleString()}</span>
                            </div>
                            <div className="border-t-2 border-gray-400 my-1"></div>
                            <p className="text-base font-bold">کۆی گشتی ماوە (قەرز)</p>
                            <p className="text-2xl font-black mt-1 text-red-700">{currentRemaining.toLocaleString()} دینار</p>
                          </div>
                        </>
                      ) : (
                        <div className="w-full flex justify-between items-center text-xs font-bold text-gray-500 mt-4">
                          <span>پەڕەی {pageObj.pageNum} (درێژەی کاڵاکان...)</span>
                          <span>مۆر و ئیمزا لە پەڕەی کۆتاییدا دەبێت</span>
                        </div>
                      )}
                    </div>
                    <div className="text-center mt-6 text-xs text-gray-400 font-sans" dir="ltr">Designed and Developed by Eng. Masrour</div>
                  </div>
                </div>
              );
            })}

          </div>
        );
      })}
    </div>
  );
}

function CashReceiptView({ theme, onAutoSave, startNewReceipt, draftId }: any) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [items, setItems] = useState<ReceiptItem[]>(() => [{ id: Date.now(), name: '', quantity: '', unit: 'دانە', price: '', isNew: true, type: 'item', note: '', dateStr: new Date().toLocaleDateString('en-GB'), timeStr: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }]);
  const [amountPaid, setAmountPaid] = useState<string | number>('');
  
  let totalItemsCost = 0;
  items.forEach(item => {
    const price = parseNumber(item.price);
    const qty = parseNumber(item.quantity);
    if (item.type !== 'payment') {
      totalItemsCost += qty * price;
    }
  });

  const totalTablePayments = items.filter(i => i.type === 'payment').reduce((sum, i) => sum + parseNumber(i.price), 0);
  const effectivePaid = parseNumber(amountPaid) > 0 ? parseNumber(amountPaid) : totalTablePayments;
  const remainingBalance = Math.max(0, totalItemsCost - effectivePaid);

  useEffect(() => {
    onAutoSave({ customerName: customerName || 'کڕیاری نەناسراو', phone: customerPhone, date: new Date().toISOString(), totalAmount: totalItemsCost, type: 'cash', items });
  }, [customerName, customerPhone, items, totalItemsCost]);

  useEffect(() => {
    setCustomerName(''); setCustomerPhone(''); setAmountPaid(''); 
    const dateStr = new Date().toLocaleDateString('en-GB');
    const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setItems([{ id: Date.now(), name: '', quantity: '', unit: 'دانە', price: '', isNew: true, type: 'item', note: '', dateStr, timeStr }]);
  }, [draftId]);

  const addItem = () => {
    const dateStr = new Date().toLocaleDateString('en-GB');
    const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setItems([...items, { id: Date.now(), name: '', quantity: '', unit: 'دانە', price: '', isNew: true, type: 'item', note: '', dateStr, timeStr }]);
  };

  const addPayment = () => {
    const dateStr = new Date().toLocaleDateString('en-GB');
    const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setItems([...items, { id: Date.now(), name: 'پارەدان', quantity: '', unit: '-', price: '', isNew: true, type: 'payment', note: 'زیاد کریم', dateStr, timeStr }]);
  };

  const updateItem = (id: number, field: string, value: any) => {
    let processedVal = value;
    if (field === 'quantity' || field === 'price') {
      processedVal = convertToEnglishDigits(value);
    }
    setItems(items.map(i => i.id === id ? { ...i, [field]: processedVal } : i));
  };

  const removeItem = (id: number) => {
    const filtered = items.filter(i => i.id !== id);
    if (filtered.length === 0) {
      const dateStr = new Date().toLocaleDateString('en-GB');
      const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      setItems([{ id: Date.now(), name: '', quantity: '', unit: 'دانە', price: '', isNew: true, type: 'item', note: '', dateStr, timeStr }]);
    } else {
      setItems(filtered);
    }
  };

  const ITEMS_PER_PAGE = 15;
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE) || 1;
  const pagesArray = [];
  for (let p = 0; p < totalPages; p++) {
    const startIdx = p * ITEMS_PER_PAGE;
    pagesArray.push({ pageNum: p + 1, items: items.slice(startIdx, startIdx + ITEMS_PER_PAGE) });
  }

  return (
    <div className="w-full pb-20">
      <div className="max-w-[210mm] mx-auto flex justify-between items-center mb-6 print-hide">
        <h2 className={`text-2xl font-bold ${theme.text}`}>دروستکردنی وەسڵی نەقدی</h2>
        <div className="flex gap-4">
          <button type="button" onClick={startNewReceipt} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Plus size={20}/> وەسڵی نوێ</button>
          <button type="button" onClick={addPayment} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded font-bold flex items-center gap-1 text-sm"><MinusCircle size={16}/> پارەدان</button>
          <button type="button" onClick={() => window.print()} className={`${theme.main} ${theme.hover} text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2`}><Printer size={20}/> چاپکردن / PDF</button>
        </div>
      </div>

      {pagesArray.map((pageObj, pIndex) => {
        const isLastPage = pIndex === totalPages - 1;

        return (
          <div key={pIndex} className="a4-page shadow-lg mx-auto flex flex-col justify-between mb-8">
            <div>
              <div className="text-center mb-6 border-b-2 border-black pb-4">
                <h1 className={`text-3xl font-black ${theme.text} mb-2`}>توانا</h1>
                <p className="font-bold text-sm mb-1">بۆ بازرگانی گشتی کەل و پەلی دەستی و کەرەستەی بیناسازی</p>
                <p className="font-medium text-xs mb-1">ناونیشان: کۆرێ شەقامی گشتی تەنیشت بەنزینخانەی ئەفرین</p>
                <p className="font-bold text-sm mt-2" dir="ltr">0750 497 8758 - 0750 017 2002</p>
              </div>

              <div className="flex justify-between mb-6 font-bold text-base px-2">
                <div className="flex flex-col gap-2 w-1/2">
                  <div className="flex items-center gap-2"><span className="w-20">ناوی کڕیار:</span><input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="border-b-2 border-black bg-transparent outline-none flex-1 pb-0.5 text-base font-bold" /></div>
                  <div className="flex items-center gap-2"><span className="w-20">مۆبایل:</span><input type="text" value={customerPhone} onChange={(e) => setCustomerPhone(convertToEnglishDigits(e.target.value))} className="border-b-2 border-black bg-transparent outline-none flex-1 pb-0.5 text-base font-bold text-right" placeholder="0750 000 0000" dir="ltr" style={{ unicodeBidi: 'plaintext', textAlign: 'right' }} /></div>
                </div>
                <div className="text-left flex flex-col gap-1">
                  <p>بەروار: {new Date().toLocaleDateString('en-IQ')}</p>
                  <p>جۆری وەسڵ: <span className={theme.textDark}>نەقدی (پەڕەی {pageObj.pageNum} لە {totalPages})</span></p>
                </div>
              </div>

              <table className="w-full border-collapse border-2 border-black text-center mt-2">
                <thead>
                  <tr className="bg-gray-200 text-xs">
                    <th className="border-2 border-black p-1 w-6">#</th>
                    <th className="border-2 border-black p-1 text-right w-1/3">ناوی کاڵا / جۆری پارەدان</th>
                    <th className="border-2 border-black p-1 w-10">بڕ</th>
                    <th className="border-2 border-black p-1 w-14">یەکە</th>
                    <th className="border-2 border-black p-1 w-20">نرخ / پارە</th>
                    <th className="border-2 border-black p-1 w-24">کۆی گشتی</th>
                    <th className="border-2 border-black p-1 w-16">بەروار و کات</th>
                    <th className="border-2 border-black p-1 w-16">تێبینی</th>
                    <th className="border-2 border-black p-1 w-6 print-hide">🗑️</th>
                  </tr>
                </thead>
                <tbody>
                  {pageObj.items.map((item, localIdx) => {
                    const globalIdx = (pIndex * ITEMS_PER_PAGE) + localIdx;
                    const priceNum = parseNumber(item.price);
                    const qtyNum = parseNumber(item.quantity);
                    const lineTotal = item.type === 'payment' ? priceNum : qtyNum * priceNum;

                    return (
                      <tr key={item.id} className={`${item.type === 'payment' ? 'bg-green-50' : 'bg-white'} text-xs`}>
                        <td className="border-2 border-black p-0.5 font-bold">{globalIdx + 1}</td>
                        
                        <td className="border-2 border-black p-0.5">
                          <input 
                            type="text" 
                            value={item.name} 
                            onChange={(e) => updateItem(item.id, 'name', e.target.value)} 
                            onKeyDown={(e) => { 
                              if (e.key === 'Enter') { 
                                e.preventDefault(); 
                                const nextInput = document.getElementById(`cash-qty-${item.id}`);
                                if (nextInput) nextInput.focus();
                              } 
                            }}
                            className={`w-full text-right p-1 bg-transparent outline-none font-bold text-xs ${item.type === 'payment' ? 'text-green-700' : ''}`} 
                            placeholder="ناو..." 
                          />
                        </td>
                        
                        <td className="border-2 border-black p-0.5">
                          {item.type === 'payment' ? (
                            <input 
                              id={`cash-qty-${item.id}`}
                              type="text" 
                              value={item.quantity} 
                              onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} 
                              onKeyDown={(e) => { 
                                if (e.key === 'Enter') { 
                                  e.preventDefault(); 
                                  const nextInput = document.getElementById(`cash-price-${item.id}`);
                                  if (nextInput) nextInput.focus();
                                } 
                              }}
                              className="w-full text-center p-1 bg-transparent outline-none font-bold text-xs" 
                              placeholder="بڕی پارە" 
                            />
                          ) : (
                            <input 
                              id={`cash-qty-${item.id}`}
                              type="text" 
                              value={item.quantity} 
                              onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} 
                              onKeyDown={(e) => { 
                                if (e.key === 'Enter') { 
                                  e.preventDefault(); 
                                  const nextInput = document.getElementById(`cash-price-${item.id}`);
                                  if (nextInput) nextInput.focus();
                                } 
                              }}
                              className="w-full text-center p-1 bg-transparent outline-none font-bold text-xs" 
                            />
                          )}
                        </td>
                        
                        <td className="border-2 border-black p-0.5">
                          {item.type === 'payment' ? <span className="text-gray-400 font-bold">-</span> : (
                            <select value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} className="w-full text-center bg-transparent outline-none font-bold text-[10px] print:appearance-none">
                              <option>دانە</option><option>مەتر</option><option>کیلۆ</option><option>کارتۆن</option><option>دەرزەن</option><option>قوتوو</option>
                            </select>
                          )}
                        </td>
                        
                        <td className="border-2 border-black p-0.5">
                          <input 
                            id={`cash-price-${item.id}`}
                            type="text" 
                            value={item.price} 
                            onChange={(e) => updateItem(item.id, 'price', e.target.value)} 
                            onKeyDown={(e) => { 
                              if (e.key === 'Enter') { 
                                e.preventDefault(); 
                                const nextInput = document.getElementById(`cash-note-${item.id}`);
                                if (nextInput) nextInput.focus();
                              } 
                            }}
                            className="w-full text-center p-1 bg-transparent outline-none font-bold text-xs" 
                            placeholder={item.type === 'payment' ? 'بڕی پارە' : ''} 
                          />
                        </td>
                        
                        <td className={`border-2 border-black p-0.5 font-black text-xs ${item.type === 'payment' ? 'text-green-600' : 'text-red-600'}`} dir="ltr">
                          {item.type === 'payment' ? `- ${lineTotal.toLocaleString()}` : lineTotal.toLocaleString()}
                        </td>

                        <td className="border-2 border-black p-0.5 text-[9px] font-bold text-gray-700 leading-tight">
                          <div dir="ltr">{item.dateStr || '26/07/2026'}</div>
                          <div dir="ltr" className="text-gray-500">{item.timeStr || '12:30'}</div>
                        </td>
                        
                        <td className="border-2 border-black p-0.5">
                          {item.type === 'payment' ? (
                             <select 
                               id={`cash-note-${item.id}`}
                               value={item.note || 'زیاد کریم'} 
                               onChange={(e) => updateItem(item.id, 'note', e.target.value)} 
                               onKeyDown={(e) => { 
                                 if (e.key === 'Enter') { 
                                   e.preventDefault(); 
                                   addItem(); 
                                 } 
                               }}
                               className="w-full text-center bg-transparent outline-none font-bold text-[10px] text-blue-700 print:appearance-none"
                             >
                               <option value="زیاد کریم">زیاد کریم</option>
                               <option value="زانا زیاد">زانا زیاد</option>
                               <option value="شاگرد">شاگرد</option>
                             </select>
                          ) : (
                             <input 
                               id={`cash-note-${item.id}`}
                               type="text" 
                               value={item.note || ''} 
                               onChange={(e) => updateItem(item.id, 'note', e.target.value)} 
                               onKeyDown={(e) => { 
                                 if (e.key === 'Enter') { 
                                   e.preventDefault(); 
                                   addItem(); 
                                 } 
                               }}
                               className="w-full text-right p-1 bg-transparent outline-none font-normal text-[10px] text-black" 
                               placeholder="تێبینی..." 
                             />
                          )}
                        </td>

                        <td className="border-2 border-black p-0.5 print-hide">
                          <button type="button" onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-auto">

              <div className="flex justify-between items-end mt-4">
                {isLastPage ? (
                  <>
                    <div className="flex gap-16 text-base font-bold">
                      <div className="text-center"><p>ئیمزای کڕیار</p><div className="mt-8 border-b-2 border-dotted border-black w-32"></div></div>
                      <div className="text-center"><p>مۆر و ئیمزای فرۆشیار</p><div className="mt-8 border-b-2 border-dotted border-black w-32"></div></div>
                    </div>
                    
                    <div className="border-4 border-black p-4 w-80 text-center bg-gray-100 space-y-2">
                      <div className="flex justify-between font-bold text-sm">
                        <span>کۆی گشتی پارە:</span>
                        <span dir="ltr" className="font-black">{totalItemsCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center font-bold text-sm text-green-600">
                        <span>پارەی دراو:</span>
                        <input 
                          type="text" 
                          value={amountPaid} 
                          onChange={(e) => setAmountPaid(convertToEnglishDigits(e.target.value))} 
                          className="w-28 text-center p-1 bg-white border border-gray-400 rounded outline-none font-black text-base text-green-700 print:border-none print:text-green-700 print:bg-transparent" 
                          placeholder={effectivePaid > 0 ? effectivePaid.toLocaleString() : "0"}
                          dir="ltr"
                        />
                      </div>
                      <div className="border-t-2 border-gray-400 my-1"></div>
                      <div className="flex justify-between font-bold text-base">
                        <span>باقی ماوە:</span>
                        <span className="text-xl font-black text-red-700" dir="ltr">{remainingBalance.toLocaleString()} دینار</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full flex justify-between items-center text-xs font-bold text-gray-500 mt-4">
                    <span>پەڕەی {pageObj.pageNum} (درێژەی کاڵاکان...)</span>
                    <span>مۆر و ئیمزا لە پەڕەی کۆتاییدا دەبێت</span>
                  </div>
                )}
              </div>
              <div className="text-center mt-6 text-xs text-gray-400 font-sans" dir="ltr">Designed and Developed by Eng. Masrour</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StaticReceiptTemplate({ receipt, theme }: any) {
  return (
    <div className="a4-page bg-white border text-black mx-auto flex flex-col justify-between shadow-sm">
      <div>
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <h1 className={`text-3xl font-black ${theme?.text || 'text-blue-900'} mb-2`}>توانا</h1>
          <p className="font-bold text-sm mb-1">بۆ بازرگانی گشتی کەل و پەلی دەستی و کەرەستەی بیناسازی</p>
          <p className="font-medium text-xs mb-1">ناونیشان: کۆرێ شەقامی گشتی تەنیشت بەنزینخانەی ئەفرین</p>
          <p className="font-bold text-sm mt-2" dir="ltr">0750 497 8758 - 0750 017 2002</p>
        </div>
        <div className="flex justify-between mb-6 font-bold text-base px-2">
          <div className="flex flex-col gap-2 w-1/2">
            <p>ناوی کڕیار: <span className="mr-2 text-lg font-black border-b-2 border-black pb-0.5 px-3">{receipt.customerName || '---'}</span></p>
            <p>مۆبایل: <span className="mr-2 text-lg font-black border-b-2 border-black pb-0.5 px-3"><span dir="ltr" style={{ unicodeBidi: 'plaintext' }}>{receipt.phone || '---'}</span></span></p>
          </div>
          <div className="text-left flex flex-col gap-1">
            <p>بەروار: {new Date(receipt.date).toLocaleDateString('en-IQ')}</p>
            <p>جۆری وەسڵ: <span className="text-emerald-700">نەقدی</span></p>
          </div>
        </div>
        <table className="w-full border-collapse border-2 border-black text-center mt-2">
          <thead>
            <tr className="bg-gray-200 text-xs">
              <th className="border-2 border-black p-1 w-6">#</th>
              <th className="border-2 border-black p-1 text-right">ناوی ماددە (کاڵا) / پارەدان</th>
              <th className="border-2 border-black p-1 w-10">بڕ</th>
              <th className="border-2 border-black p-1 w-16">یەکە</th>
              <th className="border-2 border-black p-1 w-20">نرخی دانە</th>
              <th className="border-2 border-black p-1 w-24">کۆی گشتی</th>
              <th className="border-2 border-black p-1 w-28">تێبینی</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((item: ReceiptItem, index: number) => {
              const priceNum = parseNumber(item.price);
              const qtyNum = parseNumber(item.quantity);
              const lineTotal = item.type === 'payment' ? priceNum : qtyNum * priceNum;

              return (
                <tr key={item.id} className={`${item.type === 'payment' ? 'bg-green-50' : 'bg-white'} text-xs`}>
                  <td className="border-2 border-black p-1.5 font-bold">{index + 1}</td>
                  <td className="border-2 border-black p-1.5 text-right font-bold">{item.name}</td>
                  <td className="border-2 border-black p-1.5 font-bold">{item.type === 'payment' ? '-' : item.quantity}</td>
                  <td className="border-2 border-black p-1.5 font-bold">{item.type === 'payment' ? '-' : item.unit}</td>
                  <td className="border-2 border-black p-1.5 font-bold">{priceNum.toLocaleString()}</td>
                  <td className={`border-2 border-black p-1.5 font-black text-sm ${item.type === 'payment' ? 'text-green-600' : 'text-red-600'}`} dir="ltr">
                    {item.type === 'payment' ? `- ${lineTotal.toLocaleString()}` : lineTotal.toLocaleString()}
                  </td>
                  <td className="border-2 border-black p-1.5 font-bold text-xs text-blue-700">{item.note || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-auto">
        <div className="flex justify-between items-end pt-4 mt-4">
          <div className="flex gap-16 text-base font-bold">
            <div className="text-center"><p>ئیمزای کڕیار</p><div className="mt-8 border-b-2 border-dotted border-black w-32"></div></div>
            <div className="text-center"><p>مۆر و ئیمزای فرۆشیار</p><div className="mt-8 border-b-2 border-dotted border-black w-32"></div></div>
          </div>
          <div className="border-4 border-black p-4 w-72 text-center bg-gray-100">
            <p className="text-base font-bold">کۆی پارەی ئەم وەسڵە</p>
            <p className={`text-2xl font-black mt-1 ${theme?.textDark || 'text-emerald-700'}`}>{receipt.totalAmount.toLocaleString()} دینار</p>
          </div>
        </div>
        <div className="text-center mt-6 text-xs text-gray-400 font-sans" dir="ltr">Designed and Developed by Eng. Masrour</div>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, isActive, onClick, isDark, theme }: any) {
  return (
    <button type="button" onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${isActive ? `${theme.main} text-white shadow-md` : isDark ? `text-gray-300 hover:bg-gray-700 hover:${theme.text}` : `text-gray-600 hover:bg-gray-100 hover:${theme.text}`}`}>
      {icon} <span>{label}</span>
    </button>
  );
}

function DashboardCard({ title, amount, suffix, icon: Icon, isDark }: any) {
  return (
    <div className={`p-6 rounded-xl border flex flex-col items-center justify-center gap-4 transition-all ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
      <div className={isDark ? 'bg-gray-700 p-3 rounded-2xl' : 'bg-gray-50 p-3 rounded-2xl'}><Icon size={24} /></div>
      <div className="text-center">
         <div className="text-2xl font-black flex items-center justify-center gap-1"><span>{amount}</span>{suffix && <span className="text-sm font-bold text-gray-400">{suffix}</span>}</div>
         <div className={`text-sm mt-1 font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{title}</div>
      </div>
    </div>
  );
}