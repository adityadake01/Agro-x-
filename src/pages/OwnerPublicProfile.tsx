import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Tractor, IndianRupee, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OwnerPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  const [owner, setOwner] = useState<any>(null);
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  const [bookingMachine, setBookingMachine] = useState<any>(null);
  const [bookingDates, setBookingDates] = useState({ start: '', end: '' });

  useEffect(() => {
    const fetchOwnerAndMachines = async () => {
      if (!id) return;
      try {
        const ownerDoc = await getDoc(doc(db, 'users', id));
        if (!ownerDoc.exists() || ownerDoc.data().role !== 'owner' || ownerDoc.data().status !== 'active') {
          setNotFound(true);
          return;
        }
        setOwner({ id: ownerDoc.id, ...ownerDoc.data() });

        const q = query(collection(db, 'machines'), where('ownerId', '==', id), where('isActive', '==', true));
        const machinesSnap = await getDocs(q);
        setMachines(machinesSnap.docs.map(m => ({ id: m.id, ...m.data() })));
      } catch (error) {
        console.error('Error fetching owner data:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchOwnerAndMachines();
  }, [id]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) {
      toast.error('Please login first to book a machine');
      navigate('/login');
      return;
    }
    
    try {
      await addDoc(collection(db, 'bookings'), {
        customerId: userProfile.uid,
        customerName: userProfile.name,
        customerMobile: userProfile.mobile || '',
        machineId: bookingMachine.id,
        ownerId: owner.id,
        machineCategory: bookingMachine.category,
        startDate: bookingDates.start,
        endDate: bookingDates.end,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success('आपली बुकिंग ट्रॅक्टर मालकाला पाठवली आहे!');
      setBookingMachine(null);
      setBookingDates({ start: '', end: '' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to request booking');
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Loading profile...</div>;
  if (notFound) return <div className="text-center py-8 text-gray-500">Owner not found or inactive.</div>;

  return (
    <div className="pb-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6 mt-4">
        <div className="bg-teal-600 p-6 text-center text-white">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md text-teal-600 font-bold text-2xl">
            {owner?.businessName?.[0] || owner?.name?.[0] || 'T'}
          </div>
          <h1 className="text-2xl font-bold">{owner?.businessName || owner?.name}</h1>
          <p className="text-teal-100 flex items-center justify-center gap-1 mt-1">
            <MapPin size={16} /> {owner?.address}
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-4">Available Machines</h2>
      
      {machines.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-white rounded-xl shadow-sm">No active machines available.</div>
      ) : (
        <div className="grid gap-4">
          {machines.map((machine) => (
            <div key={machine.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-teal-50 p-2 rounded-lg">
                      <Tractor size={20} className="text-teal-600" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-900">{machine.category}</h3>
                  </div>
                  <div className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                    <IndianRupee size={14} className="mr-1" />
                    {machine.price} / {machine.pricingType === 'per_hour' ? 'Hour' : 'Acre'}
                  </div>
                </div>
                
                {machine.driverName && (
                  <p className="text-sm text-gray-600 mt-3">
                    <span className="font-medium">Driver:</span> {machine.driverName} ({machine.driverExperience} exp)
                  </p>
                )}
                
                <button 
                  className="w-full mt-4 bg-teal-600 text-white py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors"
                  onClick={() => {
                    if (!userProfile) {
                      toast.error('Please login first to book a machine');
                      navigate('/login');
                      return;
                    }
                    setBookingMachine(machine);
                  }}
                >
                  Book Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {bookingMachine && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-lg mb-4 text-gray-900">Book {bookingMachine.category}</h3>
            
            <div className="space-y-4 mb-4">
              <div className="bg-teal-50 p-4 rounded-xl text-sm text-teal-800 border border-teal-100">
                <p className="font-semibold text-base mb-1">{owner.businessName || owner.name}</p>
                {owner.upiId ? (
                  <p className="mt-2 text-teal-900">UPI ID: <span className="font-mono bg-white px-2 py-1 rounded ml-1 select-all">{owner.upiId}</span></p>
                ) : (
                  <p className="mt-2 text-teal-700 italic">No UPI ID provided</p>
                )}
              </div>
              
              <form onSubmit={handleBook} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" required className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={bookingDates.start} onChange={e => setBookingDates({...bookingDates, start: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" required className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={bookingDates.end} onChange={e => setBookingDates({...bookingDates, end: e.target.value})} />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setBookingMachine(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium">Cancel</button>
                  <button type="submit" className="flex-1 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700">Confirm Booking</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
