import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Tractor, IndianRupee, Search } from 'lucide-react';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';

export default function Home() {
  const { userProfile } = useAuth();
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingMachine, setBookingMachine] = useState<any>(null);
  const [bookingDates, setBookingDates] = useState({ start: '', end: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [banners, setBanners] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(collection(db, 'machines'), where('isActive', '==', true));
        const querySnapshot = await getDocs(q);
        const machinesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMachines(machinesData);
      } catch (error) {
        console.error('Error fetching machines data:', error);
        toast.error('Failed to load machines data');
      }

      try {
        const bannersSnap = await getDocs(collection(db, 'banners'));
        setBanners(bannersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error fetching banners data:', error);
        toast.error('Failed to load banners data');
      }
      
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const settingsSnap = await getDoc(doc(db, 'settings', 'general'));
        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data());
        }
      } catch (e) {
        console.error('Could not fetch settings', e);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const filteredMachines = machines.filter(machine => {
    const term = searchQuery.toLowerCase();
    return (
      (machine.category || '').toLowerCase().includes(term) ||
      (machine.businessName || '').toLowerCase().includes(term) ||
      (machine.ownerName || '').toLowerCase().includes(term)
    );
  });

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) {
      toast.error('Please login first to book a machine');
      return;
    }
    
    try {
      await addDoc(collection(db, 'bookings'), {
        customerId: userProfile.uid,
        customerName: userProfile.name,
        customerMobile: userProfile.mobile || '',
        machineId: bookingMachine.id,
        ownerId: bookingMachine.ownerId,
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

  return (
    <div className="pb-6">
      <div className="mb-4 mt-2">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm shadow-sm"
            placeholder="Search tractors, threshers, owners..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {banners.length > 0 && (
        <div className="mb-6 w-full overflow-x-auto flex gap-4 snap-x hide-scrollbar">
          {banners.map((banner, index) => {
            const inner = banner.type === 'video' ? (
              <video src={banner.imageUrl} autoPlay loop muted playsInline className="w-[85vw] max-w-md h-40 object-cover rounded-2xl shadow-sm snap-center shrink-0" />
            ) : (
              <img src={banner.imageUrl} alt="Banner" className="w-[85vw] max-w-md h-40 object-cover rounded-2xl shadow-sm snap-center shrink-0" referrerPolicy="no-referrer" />
            );

            if (banner.linkUrl) {
              return (
                <a key={banner.id || index} href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 snap-center">
                  {inner}
                </a>
              );
            }
            return <div key={banner.id || index} className="shrink-0 snap-center">{inner}</div>;
          })}
        </div>
      )}

      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Available Machines</h1>
        <p className="text-gray-500 text-sm">Find the right equipment for your farm</p>
      </div>

      {userProfile?.role === 'owner' && userProfile.status === 'pending' && (
        <div className="p-4 mb-6 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
          <h2 className="text-lg font-bold text-yellow-800 mb-2">Owner Account Pending Approval</h2>
          <p className="text-sm text-yellow-700 mb-4 whitespace-pre-wrap">
            {settings?.registrationMessage || `कृपया ऍडमिन ची परवानगी मिळवण्यासाठी खालील QR कोड स्कॅन करून ₹250 भरा.\nतुम्ही सध्या 'शेतकरी' (Farmer) म्हणून ॲप वापरू शकता.`}
          </p>
          <div className="bg-white p-4 inline-block rounded-xl shadow-sm mb-2 border border-yellow-100 max-w-[200px]">
            {settings?.registrationQrUrl ? (
               <img src={settings.registrationQrUrl} alt="Payment QR" className="w-full h-auto" />
            ) : (
               <QRCode value="upi://pay?pa=adityadake627@okhdfcbank&pn=Aditya%20Dake&am=250.00" size={150} fgColor="#854d0e" />
            )}
          </div>
          {!settings?.registrationQrUrl && (
            <p className="font-mono text-xs text-yellow-800 font-bold">adityadake627@okhdfcbank</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading machines...</div>
      ) : filteredMachines.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-white rounded-xl shadow-sm">
          {searchQuery ? 'No machines found matching your search.' : 'No active machines available right now.'}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMachines.map((machine) => (
            <div key={machine.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {machine.imageUrl && (
                <div className="h-48 w-full overflow-hidden bg-gray-100 relative">
                  <img src={machine.imageUrl} alt={machine.category} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-green-700 px-3 py-1 rounded-full text-sm font-bold flex items-center shadow-sm">
                    {machine.category === 'Thresher (मळणी यंत्र)' && machine.pricingType === 'per_crop' ? (
                       <span>दराचे प्रकार (Rates)</span>
                    ) : (
                      <>
                        <IndianRupee size={14} className="mr-1" />
                        {machine.price} / {machine.pricingType === 'per_hour' ? 'Hour' : 'Acre'}
                      </>
                    )}
                  </div>
                </div>
              )}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {!machine.imageUrl && (
                      <div className="bg-teal-100 p-2 rounded-lg">
                        <Tractor size={20} className="text-teal-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{machine.category}</h3>
                      <div className="text-xs text-gray-500 mt-0.5">{machine.businessName || machine.ownerName || 'Tractor Owner'}</div>
                    </div>
                  </div>
                  {!machine.imageUrl && (
                    <div className="bg-teal-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                      {machine.category === 'Thresher (मळणी यंत्र)' && machine.pricingType === 'per_crop' ? (
                         <span>दराचे प्रकार (Rates)</span>
                      ) : (
                        <>
                          <IndianRupee size={14} className="mr-1" />
                          {machine.price} / {machine.pricingType === 'per_hour' ? 'Hour' : 'Acre'}
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                {machine.driverName && (
                  <p className="text-sm text-gray-600 mt-3">
                    <span className="font-medium">Driver:</span> {machine.driverName} ({machine.driverExperience} exp)
                  </p>
                )}

                {machine.category === 'Thresher (मळणी यंत्र)' && machine.pricingType === 'per_crop' && machine.cropPrices && (
                  <div className="mt-3 bg-green-50 p-3 rounded-lg border border-green-100 mb-1">
                     <p className="font-bold text-green-800 mb-2 border-b border-green-200 pb-1 text-sm">Crop Rates (धान्याचे दर):</p>
                     <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                        {Object.entries(machine.cropPrices || {}).map(([crop, price]) => (
                           price ? <div key={crop} className="flex flex-col mb-1"><span className="font-medium text-gray-700 text-xs">{crop.split(' ')[0]}</span> <span className="text-green-700 font-bold">{price as React.ReactNode}</span></div> : null
                        ))}
                     </div>
                  </div>
                )}
                
                <button 
                  className="w-full mt-4 bg-green-700 text-white py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors"
                  onClick={() => setBookingMachine(machine)}
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
              <div className="bg-green-50 p-4 rounded-xl text-sm text-green-800 border border-green-100">
                <p className="font-semibold text-base mb-1">{bookingMachine.businessName || bookingMachine.ownerName || 'Tractor Owner'}</p>
                {bookingMachine.upiId ? (
                  <p className="mt-2 text-teal-900">UPI ID: <span className="font-mono bg-white px-2 py-1 rounded ml-1 select-all">{bookingMachine.upiId}</span></p>
                ) : (
                  <p className="mt-2 text-green-700 italic">No UPI ID provided</p>
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
                  <button type="submit" className="flex-1 py-2.5 bg-green-700 text-white rounded-lg font-medium hover:bg-green-800">Confirm Booking</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
