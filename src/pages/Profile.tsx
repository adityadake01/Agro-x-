import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import QRCode from 'react-qr-code';
import { User, LogOut, Phone, MapPin, Shield, Tractor, Briefcase, QrCode, Share2, Copy, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [showUpgradeForm, setShowUpgradeForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    mobile: '',
    tractorModel: '',
    address: '',
    businessName: '',
    upiId: ''
  });

  const [staffPin, setStaffPin] = useState('');
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const handleClaimStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    try {
      import('firebase/firestore').then(async ({ collection, query, where, getDocs }) => {
        // Check admin invite first
        let q = query(
          collection(db, 'admin_invites'), 
          where('email', '==', userProfile.email?.toLowerCase()),
          where('pin', '==', staffPin),
          where('status', '==', 'pending')
        );
        let snaps = await getDocs(q);
        
        if(!snaps.empty) {
            const inviteDoc = snaps.docs[0];
            await updateDoc(doc(db, 'users', userProfile.uid), { role: 'admin_staff' });
            await updateDoc(doc(db, 'admin_invites', inviteDoc.id), { status: 'claimed' });
            toast.success('Successfully joined as System Staff!');
            setStaffPin('');
            refreshProfile();
            return;
        }

        // Then check owner staff invite
        q = query(
          collection(db, 'staff'),
          where('email', '==', userProfile.email?.toLowerCase()),
          where('pin', '==', staffPin),
          where('status', '==', 'pending')
        );
        snaps = await getDocs(q);

        if(!snaps.empty) {
            const inviteDoc = snaps.docs[0];
            const data = inviteDoc.data();
            
            // Assign as driver
            await updateDoc(doc(db, 'users', userProfile.uid), { role: 'driver', ownerId: data.ownerId });
            await updateDoc(doc(db, 'staff', inviteDoc.id), { status: 'claimed', accountUid: userProfile.uid });
            toast.success('Successfully joined as Tractor Staff!');
            setStaffPin('');
            refreshProfile();
            return;
        }

        toast.error('Invalid PIN or no invite found for your email.');
      });
    } catch(err) {
      toast.error('Failed to verify invite');
    }
  };

  const handleEditClick = () => {
    setFormData({
      mobile: userProfile?.mobile || '',
      tractorModel: userProfile?.tractorModel || '',
      address: userProfile?.address || '',
      businessName: userProfile?.businessName || '',
      upiId: userProfile?.upiId || ''
    });
    setIsEditing(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        mobile: formData.mobile,
        tractorModel: formData.tractorModel,
        address: formData.address,
        businessName: formData.businessName,
        upiId: formData.upiId
      });
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      await refreshProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        role: 'owner',
        status: 'pending',
        mobile: formData.mobile,
        tractorModel: formData.tractorModel,
        address: formData.address,
        businessName: formData.businessName,
        upiId: formData.upiId
      });
      toast.success('Successfully applied to become an owner! Waiting for admin approval.');
      setShowUpgradeForm(false);
      await refreshProfile();
    } catch (error) {
      console.error('Error upgrading account:', error);
      toast.error('Failed to upgrade account');
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/owner/${userProfile?.uid}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

        try {
          await updateDoc(doc(db, 'users', userProfile.uid), {
            photoUrl: dataUrl
          });
          toast.success('Profile photo updated!');
          await refreshProfile();
        } catch (error) {
          console.error('Error updating photo:', error);
          toast.error('Failed to update photo');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!userProfile) return null;

  const publicUrl = `${window.location.origin}/owner/${userProfile?.uid}`;

  return (
    <div className="pb-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 mt-4">Profile</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="bg-teal-600 p-6 text-center text-white relative">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md relative group overflow-hidden border-2 border-white">
            {userProfile.photoUrl ? (
              <img src={userProfile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={40} className="text-teal-600" />
            )}
            <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
              <span className="text-[10px] uppercase font-bold text-white tracking-wider">Upload</span>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>
          <h2 className="text-xl font-bold">{userProfile.name}</h2>
          <p className="text-teal-100 text-sm capitalize">{userProfile.role}</p>
          <button 
            onClick={handleEditClick}
            className="absolute top-4 right-4 bg-white/20 p-2 rounded-full hover:bg-white/30 transition shadow-sm"
            title="Edit Profile"
          >
            <Edit2 size={16} className="text-white" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3 text-gray-700">
            <div className="bg-gray-100 p-2 rounded-lg">
              <User size={20} className="text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="font-medium">{userProfile.email}</p>
            </div>
          </div>

          {userProfile.mobile && (
            <div className="flex items-center gap-3 text-gray-700">
              <div className="bg-gray-100 p-2 rounded-lg">
                <Phone size={20} className="text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Mobile</p>
                <p className="font-medium">{userProfile.mobile}</p>
              </div>
            </div>
          )}

          {userProfile.role === 'owner' && (
            <>
              {userProfile.businessName && (
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <Briefcase size={20} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Business Name</p>
                    <p className="font-medium">{userProfile.businessName}</p>
                  </div>
                </div>
              )}
              {userProfile.upiId && (
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <QrCode size={20} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">UPI ID</p>
                    <p className="font-medium">{userProfile.upiId}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 text-gray-700">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <Tractor size={20} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Tractor Model</p>
                  <p className="font-medium">{userProfile.tractorModel}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <MapPin size={20} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Address</p>
                  <p className="font-medium">{userProfile.address}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <Shield size={20} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Account Status</p>
                  <p className={`font-medium capitalize ${
                    userProfile.status === 'active' ? 'text-teal-600' : 
                    userProfile.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {userProfile.status}
                  </p>
                </div>
              </div>
              
              {userProfile.role === 'owner' && (
                <div className="border-t border-gray-100 mt-6 pt-6">
                   <button
                     onClick={() => navigate('/staff')}
                     className="w-full flex items-center justify-between p-4 bg-teal-50 border border-teal-100 rounded-xl hover:bg-teal-100 transition-colors"
                   >
                     <div className="flex items-center gap-3">
                       <div className="bg-teal-600 p-2 rounded-lg text-white">
                         <User size={20} />
                       </div>
                       <div className="text-left">
                         <p className="font-bold text-teal-900">Manage Staff</p>
                         <p className="text-xs text-teal-700">Add drivers and workers</p>
                       </div>
                     </div>
                   </button>
                </div>
              )}
              
              {userProfile.status === 'active' && (
                <div className="border-t border-gray-100 mt-6 pt-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Share2 size={20} className="text-teal-600" /> Share Your Profile
                  </h3>
                  <div className="bg-teal-50 p-6 rounded-xl flex flex-col items-center border border-teal-100">
                    <div className="bg-white p-3 rounded-xl shadow-sm mb-4">
                      <QRCode value={publicUrl} size={150} fgColor="#0d9488" />
                    </div>
                    <p className="text-sm text-teal-800 text-center mb-4">
                      Scan this QR code or share the link below so customers can book directly with you.
                    </p>
                    <button 
                      onClick={handleCopyLink}
                      className="w-full bg-teal-600 text-white font-medium py-2.5 px-4 rounded-lg flex justify-center items-center gap-2 hover:bg-teal-700 transition"
                    >
                      <Copy size={18} /> Copy Profile Link
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Edit Profile</h3>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                <input type="tel" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" />
              </div>
              {userProfile.role === 'owner' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Name (optional)</label>
                    <input type="text" value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                    <input type="text" value={formData.upiId} onChange={e => setFormData({...formData, upiId: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tractor Model</label>
                    <input type="text" value={formData.tractorModel} onChange={e => setFormData({...formData, tractorModel: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" rows={3} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 py-3 px-4 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {userProfile.role === 'customer' && !showUpgradeForm && (
        <button 
          onClick={() => setShowUpgradeForm(true)}
          className="w-full bg-green-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors mb-4"
        >
          <Tractor size={20} />
          Become a Tractor Owner
        </button>
      )}

      {showUpgradeForm && (
        <form onSubmit={handleUpgrade} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 space-y-4">
          <h3 className="font-bold text-lg text-gray-900 mb-2">Owner Registration</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
            <input required type="tel" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name / व्यवसायाचे नाव (optional)</label>
            <input type="text" value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID (पेमेंट स्वीकारण्यासाठी)</label>
            <input type="text" value={formData.upiId} onChange={e => setFormData({...formData, upiId: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" placeholder="yourmobile@upi" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tractor Model</label>
            <input required type="text" value={formData.tractorModel} onChange={e => setFormData({...formData, tractorModel: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
            <textarea required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl" rows={3} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowUpgradeForm(false)} className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700">Cancel</button>
            <button type="submit" className="flex-1 py-3 px-4 bg-green-700 text-white rounded-xl font-medium">Submit</button>
          </div>
        </form>
      )}

      <button 
        onClick={handleLogout}
        className="w-full bg-red-50 text-red-600 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
      >
        <LogOut size={20} />
        Logout
      </button>
    </div>
  );
}
