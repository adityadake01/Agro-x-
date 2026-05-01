import React, { useState } from 'react';
import { X } from 'lucide-react';

interface AcceptBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string, time: string) => void;
}

export default function AcceptBookingModal({ isOpen, onClose, onConfirm }: AcceptBookingModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Accept Booking</h2>
          <p className="text-gray-500 text-sm mb-6">Please specify when you will send the tractor.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input 
                type="time" 
                value={time} 
                onChange={e => setTime(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl"
                required
              />
            </div>
            <button
              onClick={() => {
                if (date && time) {
                  onConfirm(date, time);
                }
              }}
              disabled={!date || !time}
              className="w-full bg-teal-600 text-white font-semibold flex items-center justify-center p-3 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 mt-6"
            >
              Confirm & Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
