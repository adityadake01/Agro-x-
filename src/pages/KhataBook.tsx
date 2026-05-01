import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { BookOpen, Plus, IndianRupee, User, Calendar, FileText, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { confirmAction } from '../utils/confirmAction';

export default function KhataBook() {
  const { currentUser, userProfile } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerMobile: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    workType: '',
    quantity: '',
    rate: '',
    paidAmount: ''
  });

  const fetchEntries = async () => {
    if (!currentUser) return;
    try {
      const targetOwnerId = userProfile?.role === 'driver' ? userProfile.ownerId : currentUser.uid;
      const q = query(
        collection(db, 'khata'), 
        where('ownerId', '==', targetOwnerId)
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory since we need a composite index for orderBy with where
      data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEntries(data);
    } catch (error) {
      console.error('Error fetching khata:', error);
      toast.error('Failed to load Khata Book');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [currentUser, userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const quantity = Number(formData.quantity);
    const rate = Number(formData.rate);
    const paidAmount = Number(formData.paidAmount) || 0;
    const totalAmount = quantity * rate;
    const pendingAmount = totalAmount - paidAmount;

    try {
      const targetOwnerId = userProfile?.role === 'driver' ? userProfile.ownerId : currentUser.uid;
      await addDoc(collection(db, 'khata'), {
        ownerId: targetOwnerId,
        customerName: formData.customerName,
        customerMobile: formData.customerMobile,
        date: formData.date,
        workType: formData.workType,
        quantity,
        rate,
        totalAmount,
        paidAmount,
        pendingAmount,
        createdAt: serverTimestamp()
      });
      
      toast.success('Entry added successfully');
      setShowForm(false);
      setFormData({
        customerName: '',
        customerMobile: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        workType: '',
        quantity: '',
        rate: '',
        paidAmount: ''
      });
      fetchEntries();
    } catch (error) {
      console.error('Error adding entry:', error);
      toast.error('Failed to add entry');
    }
  };

  const handleUpdatePayment = async (e: React.FormEvent, entryId: string, currentPaid: number, currentPending: number) => {
    e.preventDefault();
    const amount = Number(paymentAmount);
    if (amount <= 0 || amount > currentPending) {
      toast.error('Invalid payment amount');
      return;
    }

    try {
      await updateDoc(doc(db, 'khata', entryId), {
        paidAmount: currentPaid + amount,
        pendingAmount: currentPending - amount
      });
      toast.success('Payment updated');
      setShowPaymentForm(null);
      setPaymentAmount('');
      fetchEntries();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment');
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    confirmAction('Are you sure you want to delete this entry? This action cannot be undone.', async () => {
      try {
        await deleteDoc(doc(db, 'khata', entryId));
        toast.success('Entry deleted successfully');
        setEntries(entries.filter(e => e.id !== entryId));
      } catch (error) {
        console.error('Error deleting entry:', error);
        toast.error('Failed to delete entry');
      }
    });
  };

  const totalPending = entries.reduce((sum, entry) => sum + (entry.pendingAmount || 0), 0);
  const totalReceived = entries.reduce((sum, entry) => sum + (entry.paidAmount || 0), 0);

  if (userProfile?.status === 'pending') {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-xl mt-4">
        <h2 className="text-xl font-bold text-yellow-800 mb-2">Account Pending</h2>
        <p className="text-yellow-700">You can use Khata Book once an admin approves your account.</p>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="flex justify-between items-center mb-6 mt-4">
        <h1 className="text-2xl font-bold text-gray-900">Khata Book (खाते वही)</h1>
        {userProfile?.role === 'owner' && (
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-teal-600 text-white p-2 rounded-full hover:bg-teal-700"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100">
          <div className="text-sm text-gray-500 mb-1">Total Pending (बाकी)</div>
          <div className="text-xl font-bold text-red-600 flex items-center">
            <IndianRupee size={20} /> {totalPending}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-teal-100">
          <div className="text-sm text-gray-500 mb-1">Total Received (जमा)</div>
          <div className="text-xl font-bold text-teal-600 flex items-center">
            <IndianRupee size={20} /> {totalReceived}
          </div>
        </div>
      </div>

      {showForm && userProfile?.role === 'owner' && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 space-y-4">
          <h2 className="font-bold text-lg mb-2">Add New Entry</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
            <input required type="text" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
              <input type="tel" value={formData.customerMobile} onChange={e => setFormData({...formData, customerMobile: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Type (e.g. Ploughing)</label>
            <input required type="text" value={formData.workType} onChange={e => setFormData({...formData, workType: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Area/Hours</label>
              <input required type="number" step="0.01" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹)</label>
              <input required type="number" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" />
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
            <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
              <span>Total Amount:</span>
              <span>₹ {(Number(formData.quantity) * Number(formData.rate)) || 0}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount (जमा)</label>
              <input type="number" value={formData.paidAmount} onChange={e => setFormData({...formData, paidAmount: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl bg-white" placeholder="0" />
            </div>
            <div className="flex justify-between text-sm font-bold text-red-600 mt-2">
              <span>Pending Amount (बाकी):</span>
              <span>₹ {((Number(formData.quantity) * Number(formData.rate)) - (Number(formData.paidAmount) || 0)) || 0}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700">Cancel</button>
            <button type="submit" className="flex-1 py-3 px-4 bg-green-700 text-white rounded-xl font-medium">Save Entry</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading Khata Book...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-white rounded-xl shadow-sm">No entries found.</div>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => (
            <div key={entry.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                    <User size={18} className="text-teal-600" /> {entry.customerName}
                  </h3>
                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <Calendar size={14} /> {format(new Date(entry.date), 'dd MMM yyyy')}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">₹{entry.totalAmount}</div>
                    <div className={`text-xs font-medium ${entry.pendingAmount > 0 ? 'text-red-600' : 'text-teal-600'}`}>
                      {entry.pendingAmount > 0 ? `Pending: ₹${entry.pendingAmount}` : 'Settled'}
                    </div>
                  </div>
                  {userProfile?.role === 'owner' && (
                    <button onClick={() => handleDeleteEntry(entry.id)} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg mb-3">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-gray-400" />
                  <span>{entry.workType} ({entry.quantity} × ₹{entry.rate})</span>
                </div>
              </div>

              {entry.pendingAmount > 0 && (
                <>
                  {showPaymentForm === entry.id ? (
                    <form onSubmit={(e) => handleUpdatePayment(e, entry.id, entry.paidAmount, entry.pendingAmount)} className="flex gap-2 mt-3">
                      <input 
                        type="number" 
                        required
                        max={entry.pendingAmount}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="Amount received" 
                        className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <button type="submit" className="bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium">Save</button>
                      <button type="button" onClick={() => setShowPaymentForm(null)} className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium">Cancel</button>
                    </form>
                  ) : (
                    <button 
                      onClick={() => setShowPaymentForm(entry.id)}
                      className="w-full mt-2 py-2 border border-teal-200 text-green-700 rounded-lg text-sm font-medium hover:bg-teal-50"
                    >
                      Update Payment
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
