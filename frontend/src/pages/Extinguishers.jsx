import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { extinguisherSchema } from '../schemas/domainSchemas';
import { getExpiryStatus, formatDisplayDateTime, toDateTimeLocalInput } from '../utils/date';
import ConfirmDialog from '../components/ConfirmDialog';

// Default form values keep create and reset behavior consistent.
const defaults = { serialNumber: '', location: '', userId: '', type: 'CO2', size: '5 lb', installationDate: '', expiryDate: '' };

export default function Extinguishers() {
  // Auth state controls admin-only inventory management actions.
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Local UI state tracks editing mode, form visibility, dialogs, and table params.
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [dialog, setDialog] = useState({ open: false });
  const [params, setParams] = useState({ page: 1, limit: 10, search: '', status: '', sort: 'expiryDate' });

  // Inventory form validates extinguisher fields before create/update requests.
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(extinguisherSchema),
    defaultValues: defaults,
  });

  // Table query loads paginated extinguishers from the backend.
  const listQuery = useQuery({
    queryKey: ['extinguishers', params],
    queryFn: async () => (await api.get('/extinguishers', { params })).data,
  });

  // Admin-only user query supplies assignment options for inventory records.
  const usersQuery = useQuery({
    queryKey: ['assignable-users'],
    queryFn: async () => (await api.get('/users', { params: { role: 'USER', limit: 100 } })).data.data,
    enabled: isAdmin,
  });

  // Save mutation handles both create and update flows for extinguishers.
  const saveMutation = useMutation({
    mutationFn: (values) => editing ? api.put(`/extinguishers/${editing.id}`, values) : api.post('/extinguishers', values),
    onSuccess: () => {
      toast.success(editing ? 'Record updated' : 'Record added');
      setShowForm(false);
      setEditing(null);
      reset(defaults);
      queryClient.invalidateQueries({ queryKey: ['extinguishers'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Validation errors'),
  });

  // Delete mutation soft-deletes inventory records through the API.
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/extinguishers/${id}`),
    onSuccess: () => {
      toast.success('Record deleted');
      queryClient.invalidateQueries({ queryKey: ['extinguishers'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Server error'),
  });

  const showConfirm = (config) => setDialog({ open: true, ...config });
  const closeConfirm = () => setDialog({ open: false });

  // Create flow clears any previous edit state before showing the form.
  const openCreate = () => {
    setEditing(null);
    reset(defaults);
    setShowForm(true);
  };

  // Edit flow maps API values into form-friendly date-time and assignment fields.
  const openEdit = (ext) => {
    setEditing(ext);
    reset({
      serialNumber: ext.serialNumber || ext.code || '',
      location: ext.location || '',
      userId: ext.user?.id || ext.userId || '',
      type: ext.type,
      size: ext.size || '5 lb',
      installationDate: ext.installationDate ? toDateTimeLocalInput(ext.installationDate) : '',
      expiryDate: toDateTimeLocalInput(ext.expiryDate),
    });
    setShowForm(true);
  };

  // Derived table data provides safe fallbacks while the query is loading.
  const extinguishers = listQuery.data?.data || [];
  const meta = listQuery.data?.meta || { page: 1, totalPages: 1 };
  const showActions = isAdmin;

  // Page render includes filters, create/edit form, inventory table, pagination, and dialogs.
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Fire Extinguisher Inventory</h1>
        </div>
        {isAdmin && <button onClick={() => showConfirm({
          title: 'Confirm Add',
          message: 'Do you want to add a new extinguisher record?',
          confirmLabel: 'Add',
          onConfirm: () => { closeConfirm(); openCreate(); },
        })} className="bg-red-600 text-white px-4 py-2 rounded-lg">+ Add Extinguisher</button>}
      </div>

      {!showForm && (
        <div className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input placeholder="Search serial, location, type" value={params.search} onChange={(e) => setParams({ ...params, page: 1, search: e.target.value })} className="px-4 py-2 border rounded-lg sm:col-span-2" />
          <select value={params.status} onChange={(e) => setParams({ ...params, page: 1, status: e.target.value })} className="px-4 py-2 border rounded-lg">
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="UNDER_MAINTENANCE">Under Maintenance</option>
            <option value="EXPIRED">Expired</option>
          </select>
          <select value={params.sort} onChange={(e) => setParams({ ...params, sort: e.target.value })} className="px-4 py-2 border rounded-lg">
            <option value="expiryDate">Ascending</option>
            <option value="-expiryDate">Descending</option>
          </select>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit((values) => saveMutation.mutate(values))} className="bg-white rounded-xl shadow-sm border p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <h2 className="text-lg font-semibold">{editing ? 'Update Extinguisher' : 'Add New Extinguisher'}</h2>
          </div>
          {['serialNumber', 'location'].map((field) => (
            <div key={field}>
              <input placeholder={field === 'serialNumber' ? 'Serial Number' : 'Location'} {...register(field)} className="w-full px-4 py-2 border rounded-lg" />
              {errors[field] && <p className="text-xs text-red-600 mt-1">{errors[field].message}</p>}
            </div>
          ))}
          <select {...register('userId')} className="px-4 py-2 border rounded-lg sm:col-span-2">
            <option value="">Assign to user later</option>
            {(usersQuery.data || []).map((assignedUser) => (
              <option key={assignedUser.id} value={assignedUser.id}>{assignedUser.name} - {assignedUser.email}</option>
            ))}
          </select>
          {errors.userId && <p className="text-xs text-red-600 mt-1 sm:col-span-2">{errors.userId.message}</p>}
          <select {...register('type')} className="px-4 py-2 border rounded-lg">
            <option>Water</option><option>CO2</option><option>Foam</option><option>Dry Chemical</option>
          </select>
          <select {...register('size')} className="px-4 py-2 border rounded-lg">
            <option>2.5 lb</option><option>5 lb</option><option>9 lb</option><option>12 lb</option>
          </select>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Installation Date & Time</label>
            <input type="datetime-local" {...register('installationDate')} className="w-full px-4 py-2 border rounded-lg" />
            {errors.installationDate && <p className="text-xs text-red-600 mt-1">{errors.installationDate.message}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Expiry Date & Time</label>
            <input type="datetime-local" {...register('expiryDate')} className="w-full px-4 py-2 border rounded-lg" />
            {errors.expiryDate && <p className="text-xs text-red-600 mt-1">{errors.expiryDate.message}</p>}
          </div>
          <div className="sm:col-span-2 flex gap-3">
            <button disabled={isSubmitting} className="bg-red-600 text-white px-6 py-2 rounded-lg">{editing ? 'Update' : 'Add'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 border rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3">Serial</th><th className="text-left px-6 py-3">Location</th>{isAdmin && <th className="text-left px-6 py-3">Assigned To</th>}<th className="text-left px-6 py-3">Type</th><th className="text-left px-6 py-3">Size</th><th className="text-left px-6 py-3">Expiry</th><th className="text-left px-6 py-3">Status</th>{showActions && <th className="text-left px-6 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {extinguishers.map((ext) => {
              const expiry = getExpiryStatus(ext.expiryDate);
              return (
                <tr key={ext.id}>
                  <td className="px-6 py-4 font-medium">{ext.serialNumber || ext.code}</td>
                  <td className="px-6 py-4">{ext.location}</td>
                  {isAdmin && <td className="px-6 py-4">{ext.user?.name || <span className="text-gray-400">Unassigned</span>}</td>}
                  <td className="px-6 py-4">{ext.type}</td>
                  <td className="px-6 py-4">{ext.size}</td>
                  <td className="px-6 py-4">{formatDisplayDateTime(ext.expiryDate)}</td>
                  <td className={`px-6 py-4 ${expiry.class}`}>{expiry.label}</td>
                  {showActions && (
                    <td className="px-6 py-4 space-x-2">
                      {isAdmin && (
                        <>
                          <button onClick={() => showConfirm({
                            title: 'Confirm Update',
                            message: 'Do you want to edit this extinguisher record?',
                            confirmLabel: 'Edit',
                            onConfirm: () => { closeConfirm(); openEdit(ext); },
                          })} className="text-blue-600 hover:underline">Edit</button>
                          <button onClick={() => showConfirm({
                            title: 'Confirm Delete',
                            message: 'Do you want to delete this extinguisher record?',
                            confirmLabel: 'Delete',
                            danger: true,
                            onConfirm: () => { closeConfirm(); deleteMutation.mutate(ext.id); },
                          })} className="text-red-600 hover:underline">Delete</button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {!extinguishers.length && <tr><td colSpan={isAdmin ? 8 : 6} className="px-6 py-8 text-center text-gray-500">No records found.</td></tr>}
          </tbody>
        </table>
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
        confirmLabel={dialog.confirmLabel}
        danger={dialog.danger}
        onConfirm={dialog.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
