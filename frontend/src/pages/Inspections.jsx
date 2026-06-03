import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api/axios';
import { inspectionSchema } from '../schemas/domainSchemas';
import { formatDisplayDate } from '../utils/date';
import { useAuth } from '../context/AuthContext';

export default function Inspections() {
  const { isAdmin, isInspector } = useAuth();
  const queryClient = useQueryClient();
  const [params, setParams] = useState({ page: 1, limit: 10, status: '', search: '' });
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(inspectionSchema),
    defaultValues: { extinguisherId: '', inspectorId: '', scheduledDate: '', notes: '' },
  });

  const inspections = useQuery({ queryKey: ['inspections', params], queryFn: async () => (await api.get('/inspections', { params })).data });
  const extinguishers = useQuery({ queryKey: ['extinguishers-options'], queryFn: async () => (await api.get('/extinguishers', { params: { limit: 100 } })).data.data });
  const inspectors = useQuery({ queryKey: ['inspectors'], queryFn: async () => (await api.get('/users', { params: { role: 'INSPECTOR', limit: 100 } })).data.data, enabled: isAdmin });

  const schedule = useMutation({
    mutationFn: (values) => api.post('/inspections', values),
    onSuccess: () => {
      toast.success('Inspection scheduled');
      reset();
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Validation errors'),
  });

  const complete = useMutation({
    mutationFn: (id) => api.post(`/inspections/${id}/complete`, {}),
    onSuccess: () => {
      toast.success('Inspection completed');
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Unauthorized access'),
  });

  const rows = inspections.data?.data || [];
  const meta = inspections.data?.meta || { page: 1, totalPages: 1 };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Inspections</h1>
      <p className="text-gray-500 mb-6">Schedule inspections, view pending/completed history, and complete assigned work.</p>

      {isAdmin && (
        <form onSubmit={handleSubmit((values) => schedule.mutate(values))} className="bg-white border rounded-xl p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <select {...register('extinguisherId')} className="px-4 py-2 border rounded-lg">
            <option value="">Select extinguisher</option>
            {(extinguishers.data || []).map((e) => <option key={e.id} value={e.id}>{e.serialNumber || e.code} - {e.location}</option>)}
          </select>
          <select {...register('inspectorId')} className="px-4 py-2 border rounded-lg">
            <option value="">Select inspector</option>
            {(inspectors.data || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <input type="datetime-local" {...register('scheduledDate')} className="px-4 py-2 border rounded-lg" />
          <input placeholder="Notes" {...register('notes')} className="px-4 py-2 border rounded-lg" />
          <div className="md:col-span-2 text-xs text-red-600">{errors.extinguisherId?.message || errors.inspectorId?.message || errors.scheduledDate?.message}</div>
          <button className="md:col-span-2 bg-red-600 text-white py-2 rounded-lg">Schedule Inspection</button>
        </form>
      )}

      <div className="bg-white border rounded-xl p-4 mb-4 flex gap-3">
        <input placeholder="Search inspections" value={params.search} onChange={(e) => setParams({ ...params, page: 1, search: e.target.value })} className="px-4 py-2 border rounded-lg flex-1" />
        <select value={params.status} onChange={(e) => setParams({ ...params, page: 1, status: e.target.value })} className="px-4 py-2 border rounded-lg">
          <option value="">All</option><option value="PENDING">Pending</option><option value="COMPLETED">Completed</option><option value="OVERDUE">Overdue</option>
        </select>
      </div>

      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="p-3 text-left">Extinguisher</th><th className="p-3 text-left">Inspector</th><th className="p-3 text-left">Date</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Actions</th></tr></thead>
          <tbody className="divide-y">
            {rows.map((i) => <tr key={i.id}><td className="p-3">{i.extinguisher?.serialNumber || i.extinguisher?.code}</td><td className="p-3">{i.inspector?.name}</td><td className="p-3">{formatDisplayDate(i.scheduledDate)}</td><td className="p-3">{i.status}</td><td className="p-3">{(isAdmin || isInspector) && i.status !== 'COMPLETED' && <button onClick={() => complete.mutate(i.id)} className="text-green-700 hover:underline">Complete</button>}</td></tr>)}
            {!rows.length && <tr><td colSpan="5" className="p-6 text-center text-gray-500">No inspections found.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between mt-4 text-sm"><button disabled={params.page <= 1} onClick={() => setParams({ ...params, page: params.page - 1 })} className="border px-3 py-2 rounded">Previous</button><span>Page {meta.page} of {meta.totalPages || 1}</span><button disabled={params.page >= (meta.totalPages || 1)} onClick={() => setParams({ ...params, page: params.page + 1 })} className="border px-3 py-2 rounded">Next</button></div>
    </div>
  );
}
