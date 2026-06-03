import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { changePasswordSchema } from '../schemas/authSchemas';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ChangePassword() {
  const { changePassword } = useAuth();
  const [pendingValues, setPendingValues] = useState(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  const onSubmit = async (values) => {
    setPendingValues(values);
  };

  const confirmChangePassword = async () => {
    try {
      await changePassword(pendingValues);
      toast.success('Password changed');
      setPendingValues(null);
      reset();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Validation errors');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Change Password</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white border rounded-xl p-6 max-w-xl space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Current Password</label>
          <input type="password" {...register('currentPassword')} className="w-full border rounded-lg px-4 py-2" />
          {errors.currentPassword && <p className="text-xs text-red-600">{errors.currentPassword.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">New Password</label>
          <input type="password" {...register('newPassword')} className="w-full border rounded-lg px-4 py-2" />
          {errors.newPassword && <p className="text-xs text-red-600">{errors.newPassword.message}</p>}
        </div>
        <button disabled={isSubmitting} className="bg-red-600 text-white px-4 py-2 rounded-lg">Change Password</button>
      </form>
      <ConfirmDialog
        open={Boolean(pendingValues)}
        title="Confirm Update"
        message="Do you want to change your password?"
        confirmLabel="Update"
        onConfirm={confirmChangePassword}
        onCancel={() => setPendingValues(null)}
      />
    </div>
  );
}
