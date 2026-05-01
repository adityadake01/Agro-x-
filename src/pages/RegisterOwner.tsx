import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Tractor, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';

export default function RegisterOwner() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'general'));
        if (snap.exists() && snap.data().logoUrl) {
          setLogoUrl(snap.data().logoUrl);
        }
      } catch (e) {
        console.error('Failed to fetch logo for register');
      }
    };
    fetchSettings();
  }, []);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    mobile: '',
    tractorModel: '',
    address: '',
    businessName: '',
    upiId: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        const user = auth.currentUser;
        if(user) {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().role === 'owner') {
             toast.success('Logged in successfully!');
             navigate('/');
          } else {
             toast.error('Access denied. Only registered Tractor Owners can log in here.');
             auth.signOut();
             setLoading(false);
             return;
          }
        }
      } else {
        if (formData.password.length < 6) {
          toast.error('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        try {
          const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          const user = result.user;
          
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            role: 'owner',
            name: formData.name,
            email: user.email,
            mobile: formData.mobile,
            tractorModel: formData.tractorModel,
            address: formData.address,
            businessName: formData.businessName,
            upiId: formData.upiId,
            status: 'pending',
            createdAt: serverTimestamp()
          });

          toast.success('Registration successful! Waiting for admin approval.');
          navigate('/');
        } catch (error: any) {
          if (error.code === 'auth/email-already-in-use') {
            try {
              const signResult = await signInWithEmailAndPassword(auth, formData.email, formData.password);
              const user = signResult.user;
              await setDoc(doc(db, 'users', user.uid), {
                role: 'owner',
                name: formData.name,
                mobile: formData.mobile,
                tractorModel: formData.tractorModel,
                address: formData.address,
                businessName: formData.businessName,
                upiId: formData.upiId,
                status: 'pending',
                updatedAt: serverTimestamp()
              }, { merge: true });
              toast.success('Account upgraded to Tractor Owner! Waiting for admin approval.');
              navigate('/');
              return;
            } catch (signInErr: any) {
              if (signInErr.code === 'auth/invalid-credential') {
                toast.error('Email is already registered. Please check your password or login first.');
                return;
              } else {
                throw signInErr;
              }
            }
          } else {
            throw error;
          }
        }
      }
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Email is already in use. Please try logging in.');
      } else if (error.code === 'auth/invalid-credential') {
        toast.error('Wrong email or password. Please check your credentials and try again.');
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error('Please enable Email/Password authentication in Firebase Console -> Authentication -> Sign-in method.');
      } else {
        toast.error('Failed to complete action');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <Link to="/login" className="inline-flex items-center text-teal-700 hover:text-teal-800 mb-6 font-medium">
          <ArrowLeft size={20} className="mr-1" /> Back to Login
        </Link>
        
        <div className="flex justify-center mb-4">
          <img src={logoUrl || "https://s3.amazonaws.com/us-east-1.data-storage.macha/383ef11dc6984e858db1f37cc1663ba0/Agro X logo.png"} alt="Agro X Logo" className="w-24 h-24 object-contain bg-white rounded-full border border-gray-100 shadow-sm" />
        </div>
        
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            {isLogin ? 'Owner Login' : 'Tractor Owner Registration'}
          </h1>
          <p className="text-gray-500 mb-6 text-center text-sm">
            {isLogin ? 'Log in with your email and password terms.' : 'Please provide your details to complete the setup process.'}
          </p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                  <input required type="tel" name="mobile" value={formData.mobile} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-xl" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name (Optional)</label>
                  <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-xl" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tractor Model</label>
                  <input required type="text" name="tractorModel" value={formData.tractorModel} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-xl border-teal-300 focus:border-teal-500" placeholder="e.g. Mahindra 575 DI" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID (For Payments)</label>
                  <input required type="text" name="upiId" value={formData.upiId} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-xl" placeholder="mobile@upi" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea required name="address" value={formData.address} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-xl" rows={3}></textarea>
                </div>
              </>
            )}

            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
               <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-xl" />
            </div>

            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
               <div className="relative">
                 <input 
                   required 
                   type={showPassword ? "text" : "password"} 
                   name="password" 
                   value={formData.password} 
                   onChange={handleChange} 
                   className="w-full p-3 border border-gray-300 rounded-xl pr-12" 
                 />
                 <button
                   type="button"
                   onClick={() => setShowPassword(!showPassword)}
                   className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1"
                 >
                   {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                 </button>
               </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 text-white font-semibold flex items-center justify-center p-3 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-6"
            >
              {loading ? <Loader2 size={24} className="animate-spin text-white" /> : (isLogin ? 'Login' : 'Submit Registration')}
            </button>
          </form>

          <div className="mt-4 text-center">
             <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-teal-600 hover:text-teal-800 text-sm font-medium">
               {isLogin ? "Don't have an account? Register here" : "Already have an account? Login here"}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
