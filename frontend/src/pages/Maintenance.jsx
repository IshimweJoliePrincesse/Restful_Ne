import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api/axios';
import { maintenanceSchema } from '../schemas/domainSchemas';
import { formatDisplayDate } from '../utils/date';
import { useAuth } from '../context/AuthContext';

export default function Maintenance() {
  // Auth state controls who can create maintenance records.
  const { isAdmin, isInspector } = useAuth();
  const queryClient = useQueryClient();

  // Table params keep maintenance history searchable and paginated.
  const [params, setParams] = useState({ page: 1, limit: 10, search: '' });

  // Maintenance form validates action details before logging work.
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: { extinguisherId: '', actionTaken: '', maintenanceDate: '', issuesIdentified: '', notes: '', recommendations: '' },
  });

  // Page queries load maintenance logs and extinguisher choices.
  const logs = useQuery({ queryKey: ['maintenance', params], queryFn: async () => (await api.get('/maintenance', { params })).data });
  const extinguishers = useQuery({ queryKey: ['extinguishers-options'], queryFn: async () => (await api.get('/extinguishers', { params: { limit: 100 } })).data.data });

  // Create mutation saves maintenance evidence and refreshes history.
  const create = useMutation({
    mutationFn: (values) => api.post('/maintenance', values),
    onSuccess: () => {
      toast.success('Maintenance logged');
      reset();
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Validation errors'),
  });

  // Derived table data provides safe defaults while records load.
  const rows = logs.data?.data || [];
  const meta = logs.data?.meta || { page: 1, totalPages: 1 };

  // Page render shows the maintenance form, search, history table, and pagination.
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Maintenance</h1>

      {(isAdmin || isInspector) && (
        <form onSubmit={handleSubmit((values) => create.mutate(values))} className="bg-white border rounded-xl p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <select {...register('extinguisherId')} className="px-4 py-2 border rounded-lg"><option value="">Select extinguisher</option>{(extinguishers.data || []).map((e) => <option key={e.id} value={e.id}>{e.serialNumber || e.code} - {e.location}</option>)}</select>
          <input type="date" {...register('maintenanceDate')} className="px-4 py-2 border rounded-lg" />
          <input placeholder="Action taken" {...register('actionTaken')} className="px-4 py-2 border rounded-lg md:col-span-2" />
          <input placeholder="Issues identified" {...register('issuesIdentified')} className="px-4 py-2 border rounded-lg" />
          <input placeholder="Recommendations" {...register('recommendations')} className="px-4 py-2 border rounded-lg" />
          <textarea placeholder="Notes" {...register('notes')} className="px-4 py-2 border rounded-lg md:col-span-2" />
          <div className="md:col-span-2 text-xs text-red-600">{errors.extinguisherId?.message || errors.actionTaken?.message || errors.maintenanceDate?.message}</div>
          <button className="md:col-span-2 bg-red-600 text-white py-2 rounded-lg">Create Maintenance Log</button>
        </form>
      )}

      <div className="bg-white border rounded-xl p-4 mb-4">
        <input placeholder="Search maintenance history" value={params.search} onChange={(e) => setParams({ ...params, page: 1, search: e.target.value })} className="px-4 py-2 border rounded-lg w-full" />
      </div>
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="p-3 text-left">Extinguisher</th><th className="p-3 text-left">Action</th><th className="p-3 text-left">Date</th><th className="p-3 text-left">Issues</th><th className="p-3 text-left">Recommendations</th></tr></thead>
          <tbody className="divide-y">
            {rows.map((m) => <tr key={m.id}><td className="p-3">{m.extinguisher?.serialNumber || m.extinguisher?.code}</td><td className="p-3">{m.actionTaken}</td><td className="p-3">{formatDisplayDate(m.maintenanceDate)}</td><td className="p-3">{m.issuesIdentified || 'None'}</td><td className="p-3">{m.recommendations || 'None'}</td></tr>)}
            {!rows.length && <tr><td colSpan="5" className="p-6 text-center text-gray-500">No maintenance logs found.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between mt-4 text-sm"><button disabled={params.page <= 1} onClick={() => setParams({ ...params, page: params.page - 1 })} className="border px-3 py-2 rounded">Previous</button><span>Page {meta.page} of {meta.totalPages || 1}</span><button disabled={params.page >= (meta.totalPages || 1)} onClick={() => setParams({ ...params, page: params.page + 1 })} className="border px-3 py-2 rounded">Next</button></div>
    </div>
  );
}
