import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { forgotPasswordSchema } from '../schemas/authSchemas';

export default function ForgotPassword() {
  // Navigation and auth context move the user into the reset-password flow.
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();

  // Forgot-password form validates the email before requesting an OTP.
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  // Submit handler sends the reset OTP and carries the email to the next page.
  const onSubmit = async ({ email }) => {
    try {
      await forgotPassword(email);
      toast.success('Password reset OTP sent');
      navigate('/reset-password', { state: { email } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Server error');
    }
  };

  // Page render shows the reset request form and navigation back to login.
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-gray-100 p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-5">
        <h1 className="text-2xl font-bold">Forgot Password</h1>
        <p className="text-sm text-gray-500">Enter your email to receive a reset OTP.</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input {...register('email')} className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
          {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
        </div>
        <button disabled={isSubmitting} className="w-full bg-red-600 text-white py-2.5 rounded-lg disabled:opacity-50">
          {isSubmitting ? 'Sending...' : 'Send OTP'}
        </button>
        <Link to="/login" className="block text-center text-sm text-red-600 hover:underline">Back to Login</Link>
      </form>
    </div>
  );
}
