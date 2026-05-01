import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Calendar, Check, X, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import AcceptBookingModal from '../components/AcceptBookingModal';

export default function Bookings() {
  const { currentUser, userProfile } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const fetchBookings = async () => {
    if (!currentUser || !userProfile) return;
    try {
      const targetOwnerId = userProfile?.role === 'driver' ? userProfile.ownerId : currentUser.uid;
      const field = (userProfile.role === 'owner' || userProfile.role === 'driver') ? 'ownerId' : 'customerId';
      const q = query(collection(db, 'bookings'), where(field, '==', (userProfile.role === 'owner' || userProfile.role === 'driver') ? targetOwnerId : currentUser.uid));
      const querySnapshot = await getDocs(q);
      const bookingsData: any[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      bookingsData.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setBookings(bookingsData);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [currentUser, userProfile]);

  const handleUpdateStatus = async (bookingId: string, status: 'confirmed' | 'rejected', arrivalDate?: string, arrivalTime?: string) => {
    try {
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) return;

      const updateData: any = { status };
      if (status === 'confirmed' && arrivalDate && arrivalTime) {
        updateData.arrivalDate = arrivalDate;
        updateData.arrivalTime = arrivalTime;
      }

      await updateDoc(doc(db, 'bookings', bookingId), updateData);
      
      // Send notification
      let message = '';
      if (status === 'confirmed' && arrivalDate && arrivalTime) {
         message = `Your booking for ${booking.machineCategory} has been accepted. Tractor will arrive on ${arrivalDate} at ${arrivalTime}.`;
      } else if (status === 'rejected') {
         message = `Your booking for ${booking.machineCategory} was rejected.`;
      }

      if (message && booking.customerId) {
        await addDoc(collection(db, 'notifications'), {
          userId: booking.customerId,
          title: `Booking ${status === 'confirmed' ? 'Accepted' : 'Rejected'}`,
          message,
          read: false,
          createdAt: serverTimestamp(),
          bookingId: booking.id
        });
      }

      toast.success(`Booking ${status}`);
      fetchBookings();
      setAcceptModalOpen(false);
      setSelectedBookingId(null);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update booking');
    }
  };

  const openAcceptModal = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setAcceptModalOpen(true);
  };

  return (
    <div className="pb-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 mt-4">My Bookings</h1>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading bookings...</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Bookings Yet</h3>
          <p className="text-gray-500 text-sm">You haven't made any bookings.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map(booking => (
            <div key={booking.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">{booking.machineCategory}</h3>
                  <div className="text-xs text-gray-500 mt-1">
                    {(userProfile?.role === 'owner' || userProfile?.role === 'driver') ? (
                      <p>Customer: {booking.customerName} ({booking.customerMobile})</p>
                    ) : (
                      <p>Booking #{booking.id.slice(0, 6)}</p>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                  booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  booking.status === 'confirmed' ? 'bg-teal-100 text-teal-600' :
                  booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {booking.status}
                </span>
              </div>
              
              <div className="text-xs text-gray-600 flex gap-4 mt-2 bg-gray-50 p-2 rounded">
                <div>
                  <span className="block text-gray-400">Start Date</span>
                  <span className="font-medium">{new Date(booking.startDate).toLocaleDateString()}</span>
                </div>
                {booking.endDate && (
                <div>
                  <span className="block text-gray-400">End Date</span>
                  <span className="font-medium">{new Date(booking.endDate).toLocaleDateString()}</span>
                </div>
                )}
              </div>
              
              {booking.status === 'confirmed' && booking.arrivalDate && booking.arrivalTime && (
                <div className="mt-3 p-3 bg-teal-50 rounded-lg flex items-start gap-2 border border-teal-100">
                  <Clock size={16} className="text-teal-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-teal-900">Estimated Arrival</p>
                    <p className="text-xs text-teal-700">{booking.arrivalDate} at {booking.arrivalTime}</p>
                  </div>
                </div>
              )}

              {(userProfile?.role === 'owner' || userProfile?.role === 'driver') && booking.status === 'pending' && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                  <button 
                    onClick={() => openAcceptModal(booking.id)}
                    className="flex-1 py-2 bg-green-100 text-green-700 rounded-lg flex justify-center items-center gap-1 hover:bg-teal-200 transition-colors font-medium text-sm"
                  >
                    <Check size={16} /> Accept
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(booking.id, 'rejected')}
                    className="flex-1 py-2 bg-red-100 text-red-700 rounded-lg flex justify-center items-center gap-1 hover:bg-red-200 transition-colors font-medium text-sm"
                  >
                    <X size={16} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <AcceptBookingModal 
        isOpen={acceptModalOpen}
        onClose={() => setAcceptModalOpen(false)}
        onConfirm={(date, time) => {
           if (selectedBookingId) {
              handleUpdateStatus(selectedBookingId, 'confirmed', date, time);
           }
        }}
      />
    </div>
  );
}
