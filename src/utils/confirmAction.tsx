import toast from 'react-hot-toast';

export const confirmAction = (message: string, onConfirm: () => void) => {
  toast((t) => (
    <div className="flex flex-col gap-3 p-1">
      <p className="text-sm font-medium text-gray-800">{message}</p>
      <div className="flex gap-2 w-full mt-2">
        <button 
          onClick={() => {
            toast.dismiss(t.id);
          }} 
          className="bg-gray-100 text-gray-800 px-3 py-1.5 flex-1 text-sm font-medium rounded-lg hover:bg-gray-200"
        >
          Cancel
        </button>
        <button 
          onClick={() => {
            toast.dismiss(t.id);
            onConfirm();
          }} 
          className="bg-red-500 text-white px-3 py-1.5 flex-1 text-sm font-medium rounded-lg hover:bg-red-600"
        >
          Confirm
        </button>
      </div>
    </div>
  ), { duration: 8000, position: 'top-center' });
};
