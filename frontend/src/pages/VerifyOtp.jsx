import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function VerifyOtp() {
  // Route state pre-fills the email from registration when available.
  const location = useLocation();

  // OTP state tracks user input, server feedback, and loading status.
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();

  // OTP input accepts digits only and caps the value at six characters.
  const handleOtpChange = (e) => {
    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
  };

  // Submit handler verifies the OTP and sends the user back to login.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required. Please register first.');
      return;
    }
    if (otp.length !== 6) {
      setError('Please enter the full 6-digit OTP.');
      return;
    }
    setError('');
    setResendMessage('');
    setLoading(true);
    try {
      await verifyOtp(email.trim(), otp);
      toast.success('OTP verified. Please log in with your credentials.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP verification failed');
      setError(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Resend handler requests a fresh OTP for the entered email address.
  const handleResend = async () => {
    if (!email) {
      setError('Enter your email address first.');
      return;
    }
    setError('');
    setResendMessage('');
    setLoading(true);
    try {
      const res = await api.post('/auth/resend-otp', { email: email.trim() });
      toast.success('OTP sent');
      setResendMessage(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP');
      setError(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  // Verification screen renders OTP feedback, inputs, and resend controls.
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* Verification icon makes the OTP step clear without emoji styling. */}
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-700">
            <MailCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verify Email</h1>
          <p className="text-gray-500 mt-1">Enter the 6-digit OTP sent to your email</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
          {resendMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{resendMessage}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">OTP Code</label>
            <input type="text" inputMode="numeric" value={otp} onChange={handleOtpChange} required maxLength={6}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-center text-2xl tracking-widest"
              placeholder="000000" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
          <button type="button" onClick={handleResend} disabled={loading}
            className="w-full border border-red-200 text-red-700 hover:bg-red-50 font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50">
            Resend OTP
          </button>
          <p className="text-center text-sm text-gray-500">
            <Link to="/login" className="text-red-600 hover:underline font-medium">Back to Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
