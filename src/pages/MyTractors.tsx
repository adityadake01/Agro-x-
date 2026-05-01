import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Tractor, Plus, Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { confirmAction } from '../utils/confirmAction';

const CATEGORIES = [
  'Plough (नांगर)',
  'Rotavator (रोटावेटर)',
  'Cultivator (मोगडा)',
  'Ridger (सरी यंत्र (V पास))',
  'Trolley (ट्रॉली)',
  'Thresher (मळणी यंत्र)',
  'Other (इतर)'
];

const CROPS = [
  'जेवरी (Jowar)', 'बाजरी (Bajra)', 'तुर (Tur)', 'मक्का (Maize)', 'गहू (Wheat)', 
  'हरभरा (Gram)', 'कांदा बी (Onion Seeds)', 'मूग (Moong)', 'उडीद (Urad)', 
  'सोयाबीन (Soybean)', 'सूर्यफूल (Sunflower)'
];

export default function MyTractors() {
  const { currentUser, userProfile } = useAuth();
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    category: CATEGORIES[0],
    pricingType: 'per_hour',
    price: '',
    driverName: '',
    driverExperience: '',
    imageUrl: '',
    cropPrices: {} as Record<string, string>,
    isActive: true
  });

  const fetchMachines = async () => {
    if (!currentUser) return;
    try {
      const targetOwnerId = userProfile?.role === 'driver' ? userProfile.ownerId : currentUser.uid;
      const q = query(collection(db, 'machines'), where('ownerId', '==', targetOwnerId));
      const querySnapshot = await getDocs(q);
      setMachines(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching machines:', error);
      toast.error('Failed to load machines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, [currentUser, userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const targetOwnerId = userProfile?.role === 'driver' ? userProfile.ownerId : currentUser.uid;
      await addDoc(collection(db, 'machines'), {
        ownerId: targetOwnerId,
        ownerName: userProfile?.name || '',
        businessName: userProfile?.businessName || '',
        upiId: userProfile?.upiId || '',
        category: formData.category,
        pricingType: formData.category === 'Thresher (मळणी यंत्र)' ? 'per_crop' : formData.pricingType,
        price: formData.category === 'Thresher (मळणी यंत्र)' ? 0 : Number(formData.price),
        cropPrices: formData.category === 'Thresher (मळणी यंत्र)' ? formData.cropPrices : null,
        driverName: formData.driverName,
        driverExperience: formData.driverExperience,
        imageUrl: formData.imageUrl,
        isActive: formData.isActive,
        createdAt: serverTimestamp()
      });
      toast.success('Machine added successfully');
      setShowForm(false);
      setFormData({
        category: CATEGORIES[0],
        pricingType: 'per_hour',
        price: '',
        driverName: '',
        driverExperience: '',
        imageUrl: '',
        cropPrices: {} as Record<string, string>,
        isActive: true
      });
      fetchMachines();
    } catch (error) {
      console.error('Error adding machine:', error);
      toast.error('Failed to add machine');
    }
  };

  const handleDelete = async (id: string) => {
    confirmAction('Are you sure you want to delete this machine?', async () => {
      try {
        await deleteDoc(doc(db, 'machines', id));
        toast.success('Machine deleted');
        fetchMachines();
      } catch (error) {
        console.error('Error deleting machine:', error);
        toast.error('Failed to delete machine');
      }
    });
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'machines', id), { isActive: !currentStatus });
      fetchMachines();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  if (userProfile?.status === 'pending') {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-xl mt-4">
        <h2 className="text-xl font-bold text-yellow-800 mb-2">Account Pending</h2>
        <p className="text-yellow-700">You can add tractors once an admin approves your account.</p>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="flex justify-between items-center mb-6 mt-4">
        <h1 className="text-2xl font-bold text-gray-900">My Tractors</h1>
        {userProfile?.role === 'owner' && (
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-teal-600 text-white p-2 rounded-full hover:bg-teal-700"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      {showForm && userProfile?.role === 'owner' && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 space-y-4">
          <h2 className="font-bold text-lg mb-2">Add New Machine</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select 
              value={formData.category} 
              onChange={e => setFormData({...formData, category: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-xl bg-white"
            >
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          {formData.category === 'Thresher (मळणी यंत्र)' ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Crop Prices</label>
              <p className="text-xs text-gray-500">दर सेट करा जसे: "१० किलो", "₹५०० कुंटलमागे" किंवा रिकामा सोडा.</p>
              <div className="grid grid-cols-2 gap-2">
                {CROPS.map(crop => (
                   <div key={crop}>
                      <label className="block text-xs text-gray-600 truncate mb-1">{crop}</label>
                      <input
                         type="text"
                         value={formData.cropPrices?.[crop] || ''}
                         onChange={e => setFormData({...formData, cropPrices: {...(formData.cropPrices||{}), [crop]: e.target.value}})}
                         placeholder="उदा: 10 किलो"
                         className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                      />
                   </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Type</label>
                <select 
                  value={formData.pricingType} 
                  onChange={e => setFormData({...formData, pricingType: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-xl bg-white"
                >
                  <option value="per_hour">Per Hour</option>
                  <option value="per_acre">Per Acre</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                <input 
                  required 
                  type="number" 
                  value={formData.price} 
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-xl" 
                  placeholder="e.g. 800"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name (Optional)</label>
            <input 
              type="text" 
              value={formData.driverName} 
              onChange={e => setFormData({...formData, driverName: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-xl" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Driver Experience (Optional)</label>
            <input 
              type="text" 
              value={formData.driverExperience} 
              onChange={e => setFormData({...formData, driverExperience: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-xl" 
              placeholder="e.g. 5 years"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tractor Photo URL (Optional)</label>
            <input 
              type="url" 
              value={formData.imageUrl} 
              onChange={e => setFormData({...formData, imageUrl: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-xl" 
              placeholder="https://example.com/photo.jpg"
            />
            <p className="text-xs text-gray-500 mt-1">Paste a link to your tractor's photo</p>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="isActive" 
              checked={formData.isActive} 
              onChange={e => setFormData({...formData, isActive: e.target.checked})}
              className="w-5 h-5 text-teal-600 rounded"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Available for booking</label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700">Cancel</button>
            <button type="submit" className="flex-1 py-3 px-4 bg-green-700 text-white rounded-xl font-medium">Save</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading machines...</div>
      ) : machines.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-white rounded-xl shadow-sm">You haven't added any machines yet.</div>
      ) : (
        <div className="space-y-4">
          {machines.map(machine => (
            <div key={machine.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {machine.imageUrl && (
                <div className="h-48 w-full overflow-hidden bg-gray-100">
                  <img src={machine.imageUrl} alt={machine.category} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    {!machine.imageUrl && (
                      <div className="bg-teal-100 p-2 rounded-lg">
                        <Tractor size={20} className="text-teal-600" />
                      </div>
                    )}
                    <h3 className="font-bold text-lg text-gray-900">{machine.category}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {userProfile?.role === 'owner' && (
                      <>
                        <button 
                          onClick={() => toggleActive(machine.id, machine.isActive)}
                          className={`text-xs px-2 py-1 rounded-full font-medium ${machine.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                        >
                          {machine.isActive ? 'Active' : 'Inactive'}
                        </button>
                        <button onClick={() => handleDelete(machine.id)} className="text-red-500 p-1 hover:bg-red-50 rounded">
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  {machine.category === 'Thresher (मळणी यंत्र)' && machine.pricingType === 'per_crop' ? (
                    <div className="mt-2 bg-green-50 p-2 rounded border border-green-100 mb-2">
                       <p className="font-bold text-green-800 mb-1">Crop Rates:</p>
                       <div className="grid grid-cols-2 gap-1 text-xs">
                          {Object.entries(machine.cropPrices || {}).map(([crop, price]) => (
                             price ? <div key={crop}><span className="font-medium">{crop.split(' ')[0]}:</span> {price as React.ReactNode}</div> : null
                          ))}
                       </div>
                    </div>
                  ) : (
                    <p><span className="font-medium">Price:</span> ₹{machine.price} / {machine.pricingType === 'per_hour' ? 'Hour' : 'Acre'}</p>
                  )}
                  {machine.driverName && <p><span className="font-medium">Driver:</span> {machine.driverName} ({machine.driverExperience})</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
