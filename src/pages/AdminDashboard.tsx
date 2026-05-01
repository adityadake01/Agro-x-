import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Tractor, Calendar, CheckCircle, XCircle, LayoutDashboard, Search, Ban, Check, Image as ImageIcon, Trash2, Settings as SettingsIcon } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../contexts/AuthContext';
import { confirmAction } from '../utils/confirmAction';

type Tab = 'overview' | 'farmers' | 'tractors' | 'machines' | 'bookings' | 'staff' | 'banners' | 'settings';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  
  // Data states
  const [stats, setStats] = useState({ users: 0, tractors: 0, bookings: 0 });
  const [pendingOwners, setPendingOwners] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [tractorOwners, setTractorOwners] = useState<any[]>([]);
  const [allMachines, setAllMachines] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [adminStaff, setAdminStaff] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('');
  
  const [newBannerUrl, setNewBannerUrl] = useState('');
  
  const [loading, setLoading] = useState(true);

  // States for expanding user actions
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch stats
      const usersSnap = await getDocs(collection(db, 'users'));
      const machinesSnap = await getDocs(collection(db, 'machines'));
      const bookingsSnap = await getDocs(collection(db, 'bookings'));

      setStats({
        users: usersSnap.size,
        tractors: machinesSnap.size,
        bookings: bookingsSnap.size
      });

      // Fetch pending owners
      const pendingQ = query(collection(db, 'users'), where('role', '==', 'owner'), where('status', '==', 'pending'));
      const pendingSnap = await getDocs(pendingQ);
      setPendingOwners(pendingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Fetch Farmers (Customers)
      const farmersQ = query(collection(db, 'users'), where('role', '==', 'customer'));
      const farmersSnap = await getDocs(farmersQ);
      setFarmers(farmersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Fetch all Tractor Owners except pending (pending is on overview)
      const ownersQ = query(collection(db, 'users'), where('role', '==', 'owner'));
      const ownersSnap = await getDocs(ownersQ);
      setTractorOwners(ownersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((o: any) => o.status !== 'pending'));
      
      // Fetch Admin Staff
      const staffQ = query(collection(db, 'users'), where('role', '==', 'admin_staff'));
      const staffSnap = await getDocs(staffQ);
      setAdminStaff(staffSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Fetch Bookings
      const allBookings = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      allBookings.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setBookings(allBookings);

      // Fetch all Machines
      const allMachinesData = machinesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllMachines(allMachinesData);
      
      // Fetch Banners
      const bannersSnap = await getDocs(collection(db, 'banners'));
      setBanners(bannersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Fetch Settings
      try {
        const settingsSnap = await getDocs(query(collection(db, 'settings')));
        if (!settingsSnap.empty) {
          const generalSettings = settingsSnap.docs.find(d => d.id === 'general');
          if (generalSettings) setSettings(generalSettings.data());
        }
      } catch (e) {
        console.error('Could not fetch settings', e);
      }

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const { userProfile } = useAuth();
  
  const handleApproval = async (userId: string, status: 'active' | 'rejected' | 'banned', requiredRole?: string) => {
    if (requiredRole === 'super_admin' && userProfile?.role !== 'admin') {
      toast.error('Only the main Admin can perform this action.');
      return;
    }
    
    try {
      await updateDoc(doc(db, 'users', userId), { status });
      toast.success(`User status updated to ${status}`);
      setExpandedUser(null);
      fetchData(); // Refresh list
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDeleteUser = async (userId: string, requiredRole?: string) => {
    if (requiredRole === 'super_admin' && userProfile?.role !== 'admin') {
      toast.error('Only the main Admin can perform this action.');
      return;
    }

    confirmAction('Are you sure you want to delete this user? This cannot be undone.', async () => {
      try {
        await deleteDoc(doc(db, 'users', userId));
        toast.success('User deleted from database');
        setExpandedUser(null);
        fetchData();
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('Failed to delete user');
      }
    });
  };

  const handleDeleteMachine = async (id: string) => {
    confirmAction('Are you sure you want to delete this machine?', async () => {
      try {
        await deleteDoc(doc(db, 'machines', id));
        toast.success('Machine deleted');
        fetchData();
      } catch (error) {
        console.error('Error deleting machine:', error);
        toast.error('Failed to delete machine');
      }
    });
  };

  const handleDeleteBooking = async (id: string) => {
    confirmAction('Are you sure you want to delete this booking?', async () => {
      try {
        await deleteDoc(doc(db, 'bookings', id));
        toast.success('Booking deleted');
        fetchData();
      } catch (error) {
        console.error('Error deleting booking:', error);
        toast.error('Failed to delete booking');
      }
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 250;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png'); // UI logo best with transparent png usually
        
        try {
           // We'll just upsert general settings
           const settingsRef = doc(db, 'settings', 'general');
           // Get first to check if exists, or use setDoc with merge
           const { setDoc } = await import('firebase/firestore');
           await setDoc(settingsRef, { logoUrl: dataUrl }, { merge: true });
           toast.success('Logo updated successfully!');
           fetchData();
        } catch (err) {
           toast.error('Failed to update logo');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (loading && stats.users === 0) return <div className="text-center py-8">Loading dashboard...</div>;

  return (
    <div className="pb-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-4">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1 mb-6 overflow-x-auto hide-scrollbar">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'farmers', label: 'Farmers', icon: Users },
          { id: 'tractors', label: 'Owners', icon: Tractor },
          { id: 'machines', label: 'Machines', icon: Tractor },
          { id: 'bookings', label: 'Bookings', icon: Calendar },
          { id: 'staff', label: 'System Staff', icon: Users },
          { id: 'banners', label: 'Banners', icon: ImageIcon },
          { id: 'settings', label: 'Settings', icon: SettingsIcon }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id 
                  ? 'bg-teal-100 text-teal-600' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <div className="grid grid-cols-3 gap-4 mb-8">
              <button onClick={() => setActiveTab('farmers')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center hover:bg-gray-50 transition-colors w-full">
                <Users className="mx-auto text-blue-500 mb-2" size={24} />
                <div className="text-2xl font-bold text-gray-900">{stats.users}</div>
                <div className="text-xs text-gray-500">Users</div>
              </button>
              <button onClick={() => setActiveTab('tractors')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center hover:bg-gray-50 transition-colors w-full">
                <Tractor className="mx-auto text-teal-500 mb-2" size={24} />
                <div className="text-2xl font-bold text-gray-900">{stats.tractors}</div>
                <div className="text-xs text-gray-500">Tractors</div>
              </button>
              <button onClick={() => setActiveTab('bookings')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center hover:bg-gray-50 transition-colors w-full">
                <Calendar className="mx-auto text-purple-500 mb-2" size={24} />
                <div className="text-2xl font-bold text-gray-900">{stats.bookings}</div>
                <div className="text-xs text-gray-500">Bookings</div>
              </button>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center justify-between">
              Pending Approvals
              <span className="bg-yellow-100 text-yellow-800 text-xs py-1 px-2 rounded-full">
                {pendingOwners.length} pending
              </span>
            </h2>
            
            {pendingOwners.length === 0 ? (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center text-gray-500">
                No pending approvals.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingOwners.map(owner => (
                  <div key={owner.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-gray-900">{owner.name}</h3>
                      {owner.businessName && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{owner.businessName}</span>}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><span className="font-medium">Mobile:</span> {owner.mobile}</p>
                      <p><span className="font-medium">Email:</span> {owner.email}</p>
                      <p><span className="font-medium">Tractor:</span> {owner.tractorModel}</p>
                      <p><span className="font-medium">Address:</span> {owner.address}</p>
                      {owner.upiId && <p><span className="font-medium">UPI:</span> {owner.upiId}</p>}
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button 
                        onClick={() => handleApproval(owner.id, 'active', 'super_admin')}
                        className="flex-1 bg-green-100 text-green-700 py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-teal-200"
                      >
                        <CheckCircle size={18} /> Approve
                      </button>
                      <button 
                        onClick={() => handleApproval(owner.id, 'rejected', 'super_admin')}
                        className="flex-1 bg-red-100 text-red-700 py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-red-200"
                      >
                        <XCircle size={18} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'farmers' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Farmers (Customers)</h2>
            {farmers.length === 0 ? (
              <div className="text-center text-gray-500 py-4">No farmers found.</div>
            ) : (
              <div className="space-y-3">
                {farmers.map(farmer => (
                  <div key={farmer.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div 
                      className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedUser(expandedUser === farmer.id ? null : farmer.id)}
                    >
                      <div>
                        <h3 className="font-bold text-gray-900">{farmer.name}</h3>
                        <p className="text-xs text-gray-500">{farmer.email}</p>
                        {farmer.status === 'banned' && (
                          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded mt-1 inline-block">Banned</span>
                        )}
                      </div>
                      <div className="text-gray-400">
                        {expandedUser === farmer.id ? '▼' : '▶'}
                      </div>
                    </div>
                    {expandedUser === farmer.id && (
                      <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50 flex gap-2 flex-wrap">
                        {farmer.status === 'banned' ? (
                          <button onClick={() => handleApproval(farmer.id, 'active', 'super_admin')} className="flex-1 bg-white border border-teal-200 text-teal-600 p-2 hover:bg-green-50 rounded-lg flex items-center justify-center gap-1 text-sm font-medium">
                            <Check size={16} /> Unban
                          </button>
                        ) : (
                          <button onClick={() => handleApproval(farmer.id, 'banned', 'super_admin')} className="flex-1 bg-white border border-red-200 text-red-500 p-2 hover:bg-red-50 rounded-lg flex items-center justify-center gap-1 text-sm font-medium">
                            <Ban size={16} /> Ban
                          </button>
                        )}
                        <button onClick={() => handleDeleteUser(farmer.id, 'super_admin')} className="flex-1 bg-white border border-red-200 text-red-500 p-2 hover:bg-red-50 rounded-lg flex items-center justify-center gap-1 text-sm font-medium">
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tractors' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Tractor Owners</h2>
            {tractorOwners.length === 0 ? (
              <div className="text-center text-gray-500 py-4">No tractor owners found.</div>
            ) : (
              <div className="space-y-3">
                {tractorOwners.map(owner => (
                  <div key={owner.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div 
                      className="p-4 flex flex-col gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedUser(expandedUser === owner.id ? null : owner.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            {owner.name}
                            {expandedUser === owner.id ? <span className="text-gray-400 text-xs">▼</span> : <span className="text-gray-400 text-xs">▶</span>}
                          </h3>
                          {owner.businessName && <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded inline-block mt-1">{owner.businessName}</span>}
                          {owner.status !== 'active' && (
                            <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded inline-block ${
                              owner.status === 'banned' ? 'text-red-600 bg-red-50' : 'text-yellow-600 bg-yellow-50'
                            }`}>
                              {owner.status}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-2 rounded">
                        <p><span className="font-medium">Mobile:</span> {owner.mobile}</p>
                        <p><span className="font-medium">Email:</span> {owner.email}</p>
                        <p><span className="font-medium">Tractor:</span> {owner.tractorModel}</p>
                        <p><span className="font-medium">Address:</span> {owner.address}</p>
                        {owner.upiId && <p><span className="font-medium">UPI:</span> {owner.upiId}</p>}
                      </div>
                    </div>
                    {expandedUser === owner.id && (
                      <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50 flex gap-2 flex-wrap">
                         {owner.status !== 'active' && owner.status !== 'banned' && (
                          <button onClick={() => handleApproval(owner.id, 'active', 'super_admin')} className="flex-1 bg-white border border-teal-200 text-teal-600 p-2 hover:bg-teal-50 rounded-lg flex items-center justify-center gap-1 text-sm font-medium">
                            <Check size={16} /> Approve
                          </button>
                         )}
                         {owner.status === 'banned' ? (
                            <button onClick={() => handleApproval(owner.id, 'active', 'super_admin')} className="flex-1 bg-white border border-green-200 text-green-600 p-2 hover:bg-green-50 rounded-lg flex items-center justify-center gap-1 text-sm font-medium">
                              <Check size={16} /> Unban
                            </button>
                         ) : (
                            <button onClick={() => handleApproval(owner.id, 'banned', 'super_admin')} className="flex-1 bg-white border border-orange-200 text-orange-500 p-2 hover:bg-orange-50 rounded-lg flex items-center justify-center gap-1 text-sm font-medium">
                              <Ban size={16} /> Ban
                            </button>
                         )}
                         <button onClick={() => handleDeleteUser(owner.id, 'super_admin')} className="flex-1 bg-white border border-red-200 text-red-500 p-2 hover:bg-red-50 rounded-lg flex items-center justify-center gap-1 text-sm font-medium">
                           <Trash2 size={16} /> Delete
                         </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'machines' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-xl font-bold text-gray-900">All Machines</h2>
              <div className="text-center px-4 py-1.5 bg-gray-100 rounded-lg border border-gray-200">
                <div className="text-lg font-bold text-gray-800">{allMachines.length}</div>
                <div className="text-[10px] text-gray-600 uppercase tracking-wider">Total</div>
              </div>
            </div>

            {allMachines.length === 0 ? (
              <div className="text-center text-gray-500 py-4">No machines found.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {allMachines.map(machine => (
                  <div key={machine.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-900 line-clamp-1">{machine.category}</h3>
                      <p className="text-xs text-gray-500">Owner ID: {machine.ownerId?.slice(0, 8)}...</p>
                      <p className="text-sm font-medium text-teal-700 mt-1">₹{machine.price} / {machine.pricingType === 'per_hour' ? 'hr' : 'acre'}</p>
                    </div>
                    <button onClick={() => handleDeleteMachine(machine.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg flex items-center justify-center transition-colors">
                       <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-xl font-bold text-gray-900">All Bookings</h2>
              <div className="flex gap-2">
                <div className="text-center px-3 py-1 bg-yellow-50 rounded-lg border border-yellow-100">
                  <div className="text-lg font-bold text-yellow-700">{bookings.filter(b => b.status === 'pending').length}</div>
                  <div className="text-[10px] text-yellow-600 uppercase tracking-wider">Pending</div>
                </div>
                <div className="text-center px-3 py-1 bg-green-50 rounded-lg border border-green-100">
                  <div className="text-lg font-bold text-green-700">{bookings.filter(b => b.status === 'confirmed').length}</div>
                  <div className="text-[10px] text-green-600 uppercase tracking-wider">Accepted</div>
                </div>
              </div>
            </div>

            {bookings.length === 0 ? (
              <div className="text-center text-gray-500 py-4">No bookings found.</div>
            ) : (
              <div className="space-y-3">
                {bookings.map(booking => (
                  <div key={booking.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900">{booking.machineCategory}</h3>
                        <p className="text-xs text-gray-500">Farmer: {booking.customerName}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {booking.status}
                        </span>
                        <button onClick={() => handleDeleteBooking(booking.id)} className="text-red-500 p-1 hover:bg-red-50 rounded transition-colors" title="Delete Booking">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 flex gap-4 mt-2 bg-gray-50 p-2 rounded">
                      <div>
                        <span className="block text-gray-400">Start Date</span>
                        <span className="font-medium">{new Date(booking.startDate).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400">End Date</span>
                        <span className="font-medium">{new Date(booking.endDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">System Staff</h2>
            
            {userProfile?.role === 'admin' && (
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                <h3 className="font-bold text-sm text-gray-700 mb-2">Create Staff Invite</h3>
                <p className="text-xs text-gray-500 mb-3">Add a staff member's email. A 6-digit PIN will be generated. Share this PIN with them so they can claim their staff account after logging in via Google.</p>
                
                <div className="flex gap-2">
                  <input 
                    type="email" 
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="staff@gmail.com"
                    className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button 
                    onClick={async () => {
                      if (!newStaffEmail) return;
                      try {
                        const pin = Math.floor(100000 + Math.random() * 900000).toString();
                        await addDoc(collection(db, 'admin_invites'), { 
                          email: newStaffEmail.toLowerCase().trim(), 
                          pin: pin, 
                          status: 'pending', 
                          createdAt: serverTimestamp() 
                        });
                        setNewStaffPin(pin);
                        setNewStaffEmail('');
                        toast.success('Invite Created!');
                      } catch (error) {
                        console.error(error);
                        toast.error('Failed to create invite');
                      }
                    }}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700"
                  >
                    Generate PIN
                  </button>
                </div>
                
                {newStaffPin && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                    <p className="text-sm text-green-800 mb-2">Invite created! Share this PIN with the staff member:</p>
                    <p className="text-3xl font-mono font-bold text-green-900 tracking-widest">{newStaffPin}</p>
                  </div>
                )}
              </div>
            )}

            {adminStaff.length === 0 ? (
              <div className="text-center text-gray-500 py-4">No system staff found.</div>
            ) : (
              <div className="space-y-3">
                {adminStaff.map(staff => (
                  <div key={staff.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-gray-900">{staff.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{staff.email}</p>
                      {staff.status === 'banned' && (
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded mt-1 inline-block">Banned</span>
                      )}
                    </div>
                    <div>
                      {staff.status === 'banned' ? (
                        <button onClick={() => handleApproval(staff.id, 'active', 'super_admin')} className="text-teal-600 p-2 hover:bg-green-50 rounded-lg flex items-center gap-1 text-sm font-medium">
                          <Check size={16} /> Unban
                        </button>
                      ) : (
                        <button onClick={() => handleApproval(staff.id, 'banned', 'super_admin')} className="text-red-500 p-2 hover:bg-red-50 rounded-lg flex items-center gap-1 text-sm font-medium">
                          <Ban size={16} /> Ban
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'banners' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Ad Banners & Videos</h2>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
              <h3 className="font-bold text-sm text-gray-700 mb-2">Add New Ad</h3>
              <div className="space-y-3">
                <input 
                  type="url" 
                  value={newBannerUrl}
                  onChange={(e) => setNewBannerUrl(e.target.value)}
                  placeholder="Image or Video URL (https://...mp4 or .jpg)"
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                />
                <div className="flex gap-2">
                  <input 
                    type="url" 
                    id="bannerTargetLink"
                    placeholder="Link to open when clicked (optional)"
                    className="flex-1 p-3 border border-gray-300 rounded-lg text-sm"
                  />
                  <button 
                    onClick={async () => {
                      if (!newBannerUrl) return;
                      try {
                        const linkInput = document.getElementById('bannerTargetLink') as HTMLInputElement;
                        const linkUrl = linkInput?.value || '';
                        const isVideo = newBannerUrl.toLowerCase().match(/\.(mp4|webm|ogg)$/i) || newBannerUrl.includes('video');
                        
                        await addDoc(collection(db, 'banners'), { 
                          imageUrl: newBannerUrl, 
                          linkUrl: linkUrl,
                          type: isVideo ? 'video' : 'image',
                          createdAt: serverTimestamp() 
                        });
                        setNewBannerUrl('');
                        if (linkInput) linkInput.value = '';
                        fetchData();
                        toast.success('Ad added');
                      } catch (error) {
                        toast.error('Failed to add ad');
                      }
                    }}
                    className="bg-teal-600 text-white px-6 py-3 rounded-lg text-sm font-bold hover:bg-teal-700"
                  >
                    Add Ad
                  </button>
                </div>
              </div>
            </div>

            {banners.length === 0 ? (
              <div className="text-center text-gray-500 py-4">No ads found.</div>
            ) : (
              <div className="grid gap-4">
                {banners.map(banner => (
                  <div key={banner.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
                    {banner.type === 'video' ? (
                       <video src={banner.imageUrl} className="w-full h-40 object-cover" controls muted />
                    ) : (
                       <img src={banner.imageUrl} alt="Banner" className="w-full h-40 object-cover" />
                    )}
                    {banner.linkUrl && (
                      <div className="p-2 border-t border-gray-100 text-xs text-blue-600 bg-gray-50 truncate">
                        Link: {banner.linkUrl}
                      </div>
                    )}
                    <button 
                      onClick={async () => {
                        try {
                          await deleteDoc(doc(db, 'banners', banner.id));
                          fetchData();
                          toast.success('Ad deleted');
                        } catch (error) {
                          toast.error('Failed to delete ad');
                        }
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 shadow-sm z-10"
                    >
                       <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">System Settings</h2>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-6">
              <div>
                <h3 className="font-bold text-gray-900 mb-2">App Logo</h3>
                <p className="text-sm text-gray-500 mb-4">Upload a custom logo that will appear in the top left corner of the app.</p>
                
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center p-2 border border-gray-200 shadow-sm overflow-hidden auto">
                    {settings?.logoUrl ? (
                      <img src={settings.logoUrl} alt="Current Logo" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-gray-400 text-xs text-center font-medium">No Logo</span>
                    )}
                  </div>
                  
                  <div>
                    <label className="bg-teal-50 text-teal-700 hover:bg-teal-100 px-4 py-2 rounded-lg font-medium cursor-pointer transition-colors border border-teal-200 block text-center">
                      Upload Logo
                      <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-100 pt-6">
                <h3 className="font-bold text-gray-900 mb-2">Registration Settings</h3>
                <p className="text-sm text-gray-500 mb-4">QR Code and Message shown to Tractor Owners after they register, before you approve them.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Registration Admin Message</label>
                    <textarea 
                      id="regMessage"
                      defaultValue={settings?.registrationMessage || ''}
                      placeholder="e.g. Please pay ₹500 to the QR code below for registration approval..."
                      className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment QR Code URL (Image Link)</label>
                    <input 
                      type="url" 
                      id="regQrUrl"
                      defaultValue={settings?.registrationQrUrl || ''}
                      placeholder="https://.../qrcode.jpg"
                      className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        const msg = (document.getElementById('regMessage') as HTMLTextAreaElement)?.value || '';
                        const qr = (document.getElementById('regQrUrl') as HTMLInputElement)?.value || '';
                        await import('firebase/firestore').then(p => p.setDoc(doc(db, 'settings', 'general'), {
                          registrationMessage: msg,
                          registrationQrUrl: qr
                        }, { merge: true }));
                        toast.success('Registration settings updated');
                        fetchData();
                      } catch (e) {
                         toast.error('Failed to update settings');
                      }
                    }}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700"
                  >
                    Save Registration Settings
                  </button>
                </div>
              </div>

              <div className="border-t border-red-100 pt-6">
                <h3 className="font-bold text-red-600 mb-2">Danger Zone: Data Cleanup</h3>
                <p className="text-sm text-gray-500 mb-4">Clear orphaned or old data from the database.</p>
                <div className="space-y-3">
                  <button 
                    onClick={async () => {
                      confirmAction('WARNING: This will permanently delete ALL Tractors (Machines). This cannot be undone.', async () => {
                        try {
                          const loadingToast = toast.loading('Deleting all tractors...');
                          const { getDocs, collection, deleteDoc, doc } = await import('firebase/firestore');
                          const snaps = await getDocs(collection(db, 'machines'));
                          for (const docSnap of snaps.docs) {
                             await deleteDoc(doc(db, 'machines', docSnap.id));
                          }
                          toast.dismiss(loadingToast);
                          toast.success('All tractors deleted');
                          fetchData();
                        } catch (err) { toast.error('Failed to delete tractors'); }
                      });
                    }}
                    className="w-full bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100 flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} /> Delete All Tractors
                  </button>
                  <button 
                    onClick={async () => {
                      confirmAction('WARNING: This will permanently delete ALL Bookings. This cannot be undone.', async () => {
                        try {
                          const loadingToast = toast.loading('Deleting all bookings...');
                          const { getDocs, collection, deleteDoc, doc } = await import('firebase/firestore');
                          const snaps = await getDocs(collection(db, 'bookings'));
                          for (const docSnap of snaps.docs) {
                             await deleteDoc(doc(db, 'bookings', docSnap.id));
                          }
                          toast.dismiss(loadingToast);
                          toast.success('All bookings deleted');
                          fetchData();
                        } catch (err) { toast.error('Failed to delete bookings'); }
                      });
                    }}
                    className="w-full bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100 flex items-center justify-center gap-2"
                  >
                     <Trash2 size={16} /> Delete All Bookings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
