import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { profileSchema } from '../schemas/domainSchemas';

export default function Profile() {
  const { user } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || user?.name?.split(' ')[0] || '',
      lastName: user?.lastName || user?.name?.split(' ').slice(1).join(' ') || '',
    },
  });

  const onSubmit = async (values) => {
    try {
      await api.put(`/users/${user.id}`, values);
      toast.success('Record updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Server error');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white border rounded-xl p-6 max-w-xl space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">First Name</label>
          <input {...register('firstName')} className="w-full border rounded-lg px-4 py-2" />
          {errors.firstName && <p className="text-xs text-red-600">{errors.firstName.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Last Name</label>
          <input {...register('lastName')} className="w-full border rounded-lg px-4 py-2" />
          {errors.lastName && <p className="text-xs text-red-600">{errors.lastName.message}</p>}
        </div>
        <p className="text-sm text-gray-500">Email: {user?.email}</p>
        <p className="text-sm text-gray-500">Role: {user?.role}</p>
        <button disabled={isSubmitting} className="bg-red-600 text-white px-4 py-2 rounded-lg">Update Profile</button>
      </form>
    </div>
  );
}
