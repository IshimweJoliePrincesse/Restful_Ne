import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api/axios';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Users() {
  // Query client refreshes user lists after role and delete mutations.
  const queryClient = useQueryClient();

  // Local UI state tracks table filters, pagination, and confirmation dialog content.
  const [params, setParams] = useState({ page: 1, limit: 10, search: '', role: '' });
  const [dialog, setDialog] = useState({ open: false });

  // Users query loads the admin user-management table from the API.
  const usersQuery = useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const res = await api.get('/users', { params });
      return res.data;
    },
  });

  // Role mutation upgrades or downgrades users between USER and INSPECTOR.
  const updateRole = useMutation({
    mutationFn: ({ id, role }) => api.put(`/users/${id}`, { role }),
    onSuccess: () => {
      toast.success('User role updated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Server error'),
  });

  // Delete mutation soft-deletes a selected user after confirmation.
  const deleteUser = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => {
      toast.success('Record deleted');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Server error'),
  });

  // Derived table data provides safe fallbacks for loading and empty states.
  const users = usersQuery.data?.data || [];
  const meta = usersQuery.data?.meta || { page: 1, totalPages: 1 };

  // Page render shows filters, users table, pagination, and delete confirmation dialog.
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Users</h1>
      </div>

      <div className="bg-white border rounded-xl p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <input placeholder="Search name or email" value={params.search}
          onChange={(e) => setParams({ ...params, page: 1, search: e.target.value })}
          className="px-4 py-2 border rounded-lg flex-1" />
        <select value={params.role} onChange={(e) => setParams({ ...params, page: 1, role: e.target.value })} className="px-4 py-2 border rounded-lg">
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="INSPECTOR">Inspector</option>
          <option value="USER">User</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Role</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Verified</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{u.name}</td>
                  <td className="px-6 py-4">{u.email}</td>
                  <td className="px-6 py-4">{u.role}</td>
                  <td className="px-6 py-4">{u.isVerified ? 'Verified' : 'Pending'}</td>
                  <td className="px-6 py-4 space-x-2">
                    {u.role !== 'INSPECTOR' && (
                      <button onClick={() => updateRole.mutate({ id: u.id, role: 'INSPECTOR' })} className="text-blue-600 hover:underline">
                        Make Inspector
                      </button>
                    )}
                    {u.role !== 'USER' && (
                      <button onClick={() => updateRole.mutate({ id: u.id, role: 'USER' })} className="text-gray-600 hover:underline">
                        Make User
                      </button>
                    )}
                    <button onClick={() => setDialog({
                      open: true,
                      title: 'Confirm Delete',
                      message: `Do you want to delete ${u.name}?`,
                      onConfirm: () => {
                        setDialog({ open: false });
                        deleteUser.mutate(u.id);
                      },
                    })} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm">
        <button disabled={params.page <= 1} onClick={() => setParams({ ...params, page: params.page - 1 })} className="px-3 py-2 border rounded disabled:opacity-50">Previous</button>
        <span>Page {meta.page} of {meta.totalPages || 1}</span>
        <button disabled={params.page >= (meta.totalPages || 1)} onClick={() => setParams({ ...params, page: params.page + 1 })} className="px-3 py-2 border rounded disabled:opacity-50">Next</button>
      </div>
      <ConfirmDialog
        open={dialog.open}
        title={dialog.title}
        message={dialog.message}
        confirmLabel="Delete"
        danger
        onConfirm={dialog.onConfirm}
        onCancel={() => setDialog({ open: false })}
      />
    </div>
  );
}
