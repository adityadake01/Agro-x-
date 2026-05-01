import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Bell } from 'lucide-react';

export default function Notifications() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!currentUser) return;
      try {
        const q = query(
          collection(db, 'notifications'), 
          where('userId', '==', currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        const notifs: any[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        notifs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setNotifications(notifs);

        // Mark all as read
        notifs.forEach(async (n) => {
          if (!n.read) {
            await updateDoc(doc(db, 'notifications', n.id), { read: true });
          }
        });
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [currentUser]);

  return (
    <div className="pb-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 mt-4">Notifications</h1>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <Bell size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Notifications</h3>
          <p className="text-gray-500 text-sm">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notif => (
            <div key={notif.id} className={`p-4 rounded-xl border ${notif.read ? 'bg-white border-gray-100' : 'bg-teal-50 border-teal-100'}`}>
              <h3 className="font-bold text-gray-900 text-sm mb-1">{notif.title}</h3>
              <p className="text-gray-600 text-sm">{notif.message}</p>
              {notif.createdAt && (
                 <span className="text-xs text-gray-400 mt-2 block">
                   {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleString() : 'Just now'}
                 </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
