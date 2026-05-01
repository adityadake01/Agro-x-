import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, Tractor, BookOpen, Shield, User, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export const Layout = () => {
  const { userProfile, currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    // Fetch global settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().logoUrl) {
        setLogoUrl(docSnap.data().logoUrl);
      } else {
        setLogoUrl(null);
      }
    }, (error) => {
      console.error('Settings snapshot error:', error);
    });
    
    if (!currentUser) return unsubSettings;
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', currentUser.uid),
      where('read', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.docs.length);
    }, (error) => {
      console.error('Notifications snapshot error:', error);
    });
    return () => {
      unsubscribe();
      unsubSettings();
    };
  }, [currentUser]);

  const hideNav = ['/login', '/register-owner'].includes(location.pathname);

  if (hideNav) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="bg-white border-b border-gray-100 p-4 sticky top-0 z-10 flex justify-between items-center shadow-sm h-16">
        <div className="flex items-center gap-2" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          {logoUrl ? (
            <img src={logoUrl} alt="Agro X Logo" className="w-8 h-8 object-contain" />
          ) : (
             <div className="w-8 h-8 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center font-bold">AX</div>
          )}
          <div className="leading-tight">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Agro <span className="text-teal-500">X</span></h1>
            <p className="text-[9px] uppercase font-bold tracking-wider text-gray-400">it's Right For Farmers</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/notifications')} className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <Bell size={22} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
          
          {userProfile && (
            <div 
               onClick={() => navigate('/profile')}
               className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 font-bold text-sm border border-teal-200 cursor-pointer overflow-hidden"
            >
              {userProfile.photoUrl ? (
                <img src={userProfile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                userProfile.name?.[0].toUpperCase() || 'U'
              )}
            </div>
          )}
        </div>
      </header>
      
      <main className="p-4 max-w-md mx-auto w-full">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-16 z-10 max-w-md left-1/2 -translate-x-1/2 rounded-t-xl shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <NavItem to="/" icon={<Home size={22} />} label="Home" />
        <NavItem to="/bookings" icon={<Calendar size={22} />} label="Bookings" />
        
        {(userProfile?.role === 'owner' || userProfile?.role === 'driver') && userProfile.status === 'active' && (
          <>
            <NavItem to="/my-tractors" icon={<Tractor size={22} />} label="Tractors" />
            <NavItem to="/khata" icon={<BookOpen size={22} />} label="Khata" />
          </>
        )}
        
        {(userProfile?.role === 'admin' || userProfile?.role === 'admin_staff') && (
          <NavItem to="/admin" icon={<Shield size={22} />} label="Panel" />
        )}
        
        <NavItem to="/profile" icon={<User size={22} />} label="Profile" />
      </nav>
    </div>
  );
};

const NavItem = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center justify-center w-full h-full text-[10px] gap-1 transition-all",
          isActive ? "text-teal-600 font-bold scale-105" : "text-gray-400 hover:text-teal-500 hover:scale-105"
        )
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
};
