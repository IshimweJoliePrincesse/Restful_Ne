import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { resetPasswordSchema } from '../schemas/authSchemas';

export default function ResetPassword() {
  // Routing hooks prefill email from the forgot-password step and redirect after reset.
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword } = useAuth();

  // Reset form validates email, OTP, and new password before submission.
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: location.state?.email || '', otp: '', password: '' },
  });

  // Submit handler verifies the OTP and stores the new password.
  const onSubmit = async (values) => {
    try {
      await resetPassword(values);
      toast.success('Password changed');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP expired or invalid');
    }
  };

  // Page render shows password reset fields and a link back to login.
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-gray-100 p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-5">
        <h1 className="text-2xl font-bold">Reset Password</h1>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input {...register('email')} className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
          {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">OTP</label>
          <input {...register('otp')} maxLength={6} className="w-full px-4 py-2.5 border rounded-lg text-center tracking-widest focus:ring-2 focus:ring-red-500 outline-none" />
          {errors.otp && <p className="text-xs text-red-600 mt-1">{errors.otp.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input type="password" {...register('password')} className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
          {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
        </div>
        <button disabled={isSubmitting} className="w-full bg-red-600 text-white py-2.5 rounded-lg disabled:opacity-50">
          {isSubmitting ? 'Resetting...' : 'Reset Password'}
        </button>
        <Link to="/login" className="block text-center text-sm text-red-600 hover:underline">Back to Login</Link>
      </form>
    </div>
  );
}
