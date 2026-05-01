import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Plus, Trash2, Edit2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { confirmAction } from '../utils/confirmAction';

export default function Staff() {
  const { currentUser, userProfile } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [invitePin, setInvitePin] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    role: 'Driver',
    salary: ''
  });

  const fetchStaff = async () => {
    if (!currentUser) return;
    try {
      const targetOwnerId = userProfile?.role === 'driver' ? userProfile.ownerId : currentUser.uid;
      const q = query(
        collection(db, 'staff'),
        where('ownerId', '==', targetOwnerId)
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setStaff(data);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [currentUser, userProfile]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    if(!formData.email) {
       toast.error('Email is required');
       return;
    }

    try {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      const targetOwnerId = userProfile?.role === 'driver' ? userProfile.ownerId : currentUser.uid;
      
      await addDoc(collection(db, 'staff'), {
        ...formData,
        email: formData.email.toLowerCase().trim(),
        ownerId: targetOwnerId,
        pin: pin,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success('Staff invite created!');
      setInvitePin(pin);
      fetchStaff();
    } catch (error) {
      console.error('Error adding staff:', error);
      toast.error('Failed to create staff invite');
    }
  };

  const handleDeleteStaff = async (id: string) => {
    confirmAction('Are you sure you want to remove this staff member?', async () => {
      try {
        await deleteDoc(doc(db, 'staff', id));
        toast.success('Staff removed');
        fetchStaff();
      } catch (error) {
        console.error('Error deleting staff:', error);
        toast.error('Failed to remove staff');
      }
    });
  };

  return (
    <div className="pb-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Staff</h1>
          <p className="text-gray-500 text-sm">Manage drivers and workers</p>
        </div>
        {userProfile?.role === 'owner' && (
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-teal-600 text-white p-2 rounded-full shadow-sm hover:bg-teal-700"
          >
            {showForm ? <X size={20} /> : <Plus size={20} />}
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-teal-100 mb-6">
          <h2 className="font-bold text-lg mb-4 text-teal-800">Add New Staff</h2>
          <form onSubmit={handleAddStaff} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <input required type="email" placeholder="staff@gmail.com" className="w-full p-2.5 border border-gray-300 rounded-lg" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
              <input required type="text" className="w-full p-2.5 border border-gray-300 rounded-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Mobile Number</label>
              <input required type="tel" className="w-full p-2.5 border border-gray-300 rounded-lg" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
                <select className="w-full p-2.5 border border-gray-300 rounded-lg" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="Driver">Driver (ड्रायव्हर)</option>
                  <option value="Helper">Helper (मदतनीस)</option>
                  <option value="Manager">Manager (मॅनेजर)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Monthly Salary / Rate</label>
                <input type="text" placeholder="e.g. 15000" className="w-full p-2.5 border border-gray-300 rounded-lg" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} />
              </div>
            </div>
            
            <button type="submit" className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700">
              Save Staff Record
            </button>
          </form>
          
          {invitePin && (
             <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
               <p className="text-sm text-green-800 mb-2">Invite created! Share this PIN with the staff member:</p>
               <p className="text-3xl font-mono font-bold text-green-900 tracking-widest">{invitePin}</p>
             </div>
           )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading staff directory...</div>
      ) : staff.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl shadow-sm border border-gray-100">
          <Users size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium font-base">No staff added yet.</p>
          <p className="text-gray-400 text-sm mt-1">Tap the + button to add staff.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {staff.map((member) => (
            <div key={member.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-700 font-bold border border-teal-100">
                  {member.name[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">
                    {member.name}
                    {member.status === 'pending' && (
                      <span className="ml-2 text-[10px] font-medium text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded-full">Pending</span>
                    )}
                  </h3>
                  <div className="flex gap-2 text-xs items-center mt-0.5">
                    <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">{member.role}</span>
                    <span className="text-gray-500">{member.mobile}</span>
                  </div>
                </div>
              </div>
              {userProfile?.role === 'owner' && (
                <button onClick={() => handleDeleteStaff(member.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
