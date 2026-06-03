import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { extinguisherSchema } from '../schemas/domainSchemas';
import { getExpiryStatus, formatDisplayDate, toDateKey } from '../utils/date';
import ConfirmDialog from '../components/ConfirmDialog';

const defaults = { serialNumber: '', location: '', type: 'CO2', size: '5 lb', installationDate: '', expiryDate: '' };

export default function Extinguishers() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [dialog, setDialog] = useState({ open: false });
  const [params, setParams] = useState({ page: 1, limit: 10, search: '', status: '', sort: 'expiryDate' });
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(extinguisherSchema),
    defaultValues: defaults,
  });

  const listQuery = useQuery({
    queryKey: ['extinguishers', params],
    queryFn: async () => (await api.get('/extinguishers', { params })).data,
  });

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

  const openCreate = () => {
    setEditing(null);
    reset(defaults);
    setShowForm(true);
  };

  const openEdit = (ext) => {
    setEditing(ext);
    reset({
      serialNumber: ext.serialNumber || ext.code || '',
      location: ext.location || '',
      type: ext.type,
      size: ext.size || '5 lb',
      installationDate: ext.installationDate ? toDateKey(ext.installationDate) : '',
      expiryDate: toDateKey(ext.expiryDate),
    });
    setShowForm(true);
  };

  const extinguishers = listQuery.data?.data || [];
  const meta = listQuery.data?.meta || { page: 1, totalPages: 1 };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Fire Extinguisher Inventory</h1>
          <p className="text-gray-500 mt-1">Server-side pagination, search, sorting, and filtering.</p>
        </div>
        {isAdmin && <button onClick={() => showConfirm({
          title: 'Confirm Add',
          message: 'Do you want to add a new extinguisher record?',
          confirmLabel: 'Add',
          onConfirm: () => { closeConfirm(); openCreate(); },
        })} className="bg-red-600 text-white px-4 py-2 rounded-lg">+ Add Extinguisher</button>}
      </div>

      <div className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input placeholder="Search serial, location, type" value={params.search} onChange={(e) => setParams({ ...params, page: 1, search: e.target.value })} className="px-4 py-2 border rounded-lg sm:col-span-2" />
        <select value={params.status} onChange={(e) => setParams({ ...params, page: 1, status: e.target.value })} className="px-4 py-2 border rounded-lg">
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="UNDER_MAINTENANCE">Under Maintenance</option>
          <option value="EXPIRED">Expired</option>
          <option value="RETIRED">Retired</option>
        </select>
        <select value={params.sort} onChange={(e) => setParams({ ...params, sort: e.target.value })} className="px-4 py-2 border rounded-lg">
          <option value="expiryDate">Expiry asc</option>
          <option value="-expiryDate">Expiry desc</option>
          <option value="serialNumber">Serial asc</option>
          <option value="-createdAt">Newest</option>
        </select>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit((values) => saveMutation.mutate(values))} className="bg-white rounded-xl shadow-sm border p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {['serialNumber', 'location'].map((field) => (
            <div key={field}>
              <input placeholder={field === 'serialNumber' ? 'Serial Number' : 'Location'} {...register(field)} className="w-full px-4 py-2 border rounded-lg" />
              {errors[field] && <p className="text-xs text-red-600 mt-1">{errors[field].message}</p>}
            </div>
          ))}
          <select {...register('type')} className="px-4 py-2 border rounded-lg">
            <option>Water</option><option>CO2</option><option>Foam</option><option>Dry Chemical</option>
          </select>
          <select {...register('size')} className="px-4 py-2 border rounded-lg">
            <option>2.5 lb</option><option>5 lb</option><option>9 lb</option><option>12 lb</option>
          </select>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Installation Date</label>
            <input type="date" {...register('installationDate')} className="w-full px-4 py-2 border rounded-lg" />
            {errors.installationDate && <p className="text-xs text-red-600 mt-1">{errors.installationDate.message}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Expiry Date</label>
            <input type="date" {...register('expiryDate')} className="w-full px-4 py-2 border rounded-lg" />
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
              <th className="text-left px-6 py-3">Serial</th><th className="text-left px-6 py-3">Location</th><th className="text-left px-6 py-3">Type</th><th className="text-left px-6 py-3">Size</th><th className="text-left px-6 py-3">Expiry</th><th className="text-left px-6 py-3">Status</th>{isAdmin && <th className="text-left px-6 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {extinguishers.map((ext) => {
              const expiry = getExpiryStatus(ext.expiryDate);
              return (
                <tr key={ext.id}>
                  <td className="px-6 py-4 font-medium">{ext.serialNumber || ext.code}</td>
                  <td className="px-6 py-4">{ext.location}</td>
                  <td className="px-6 py-4">{ext.type}</td>
                  <td className="px-6 py-4">{ext.size}</td>
                  <td className="px-6 py-4">{formatDisplayDate(ext.expiryDate)}</td>
                  <td className={`px-6 py-4 ${expiry.class}`}>{expiry.label}</td>
                  {isAdmin && (
                    <td className="px-6 py-4 space-x-2">
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
                    </td>
                  )}
                </tr>
              );
            })}
            {!extinguishers.length && <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">No records found.</td></tr>}
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
