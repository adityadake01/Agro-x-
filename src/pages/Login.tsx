import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, getDocs, collection, query } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Tractor, Loader2, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
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
        console.error('Failed to fetch logo for login');
      }
    };
    fetchSettings();
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    address: '',
    email: '',
    password: ''
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
        
        // Admin check
        const user = auth.currentUser;
        if (user && user.email === 'adityadake627@gmail.com') {
           const docRef = doc(db, 'users', user.uid);
           const docSnap = await getDoc(docRef);
           if (docSnap.exists() && docSnap.data().role !== 'admin') {
             await setDoc(docRef, { role: 'admin' }, { merge: true });
           } else if (!docSnap.exists()) {
             await setDoc(docRef, {
               uid: user.uid,
               role: 'admin',
               name: formData.name || 'Admin',
               email: user.email,
               createdAt: serverTimestamp()
             });
           }
        }
        
        toast.success('Logged in successfully!');
        navigate('/');
      } else {
        if (formData.password.length < 6) {
          toast.error('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        try {
          const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          const user = result.user;
          const isAdminEmail = user.email === 'adityadake627@gmail.com';
          const role = isAdminEmail ? 'admin' : 'customer';

          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            role: role,
            name: formData.name,
            email: user.email,
            mobile: formData.mobile,
            address: formData.address,
            createdAt: serverTimestamp()
          });

          toast.success(`Welcome to Agro X! Logged in as ${role}`);
          navigate('/');
        } catch (error: any) {
          if (error.code === 'auth/email-already-in-use') {
            try {
               await signInWithEmailAndPassword(auth, formData.email, formData.password);
               toast.success('You already have an account. Logged in successfully!');
               navigate('/');
               return;
            } catch (err) {
               toast.error('Email is already in use. Please select "Login" instead of "Register" to enter your password.');
               return; 
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
        toast.error(error.message || `Failed to ${isLogin ? 'login' : 'register'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        <div className="flex justify-center mb-4">
          <img src={logoUrl || "https://s3.amazonaws.com/us-east-1.data-storage.macha/383ef11dc6984e858db1f37cc1663ba0/Agro X logo.png"} alt="Agro X Logo" className="w-24 h-24 object-contain bg-white rounded-full border border-gray-100 shadow-sm" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Agro X</h1>
        <p className="text-gray-500 mb-8">{isLogin ? 'Login to continue' : 'Register as Farmer'}</p>

        <form onSubmit={handleAuth} className="space-y-4 text-left">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea required name="address" value={formData.address} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-xl" rows={2}></textarea>
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
            className="w-full bg-teal-600 border-2 border-teal-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-teal-700 transition-colors mb-6 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 size={24} className="animate-spin text-white" />}
            {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>

        <div className="mt-4">
          <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-teal-600 hover:text-teal-800 text-sm font-medium">
            {isLogin ? "Don't have an account? Register here" : "Already have an account? Login here"}
          </button>
        </div>

        <div className="relative my-6 mt-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Are you a Tractor Owner?</span>
          </div>
        </div>

        <Link
          to="/register-owner"
          className="w-full bg-orange-500 text-white font-semibold py-3 px-4 rounded-xl block hover:bg-orange-600 transition-colors"
        >
          Register as Tractor Owner
        </Link>
      </div>
    </div>
  );
}
