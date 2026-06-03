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
  // Auth state determines scheduling, assignment, and result logging permissions.
  const { isAdmin, isInspector, user } = useAuth();
  const queryClient = useQueryClient();

  // Local UI state tracks filters, active result modal, and pending inspector assignments.
  const [params, setParams] = useState({ page: 1, limit: 10, status: '', search: '' });
  const [completing, setCompleting] = useState(null);
  const [assignments, setAssignments] = useState({});

  // Schedule form validates inspection requests before they are submitted.
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(inspectionSchema),
    defaultValues: { extinguisherId: '', inspectorId: '', scheduledDate: '', notes: '' },
  });

  // Result form captures inspector checklist details and recommendations.
  const {
    register: registerResult,
    handleSubmit: handleResultSubmit,
    reset: resetResult,
  } = useForm({
    defaultValues: { pressureOk: true, pinIntact: true, labelReadable: true, issuesFound: '', recommendations: '' },
  });

  // Page queries load inspections, available extinguishers, and admin inspector options.
  const inspections = useQuery({ queryKey: ['inspections', params], queryFn: async () => (await api.get('/inspections', { params })).data });
  const extinguishers = useQuery({ queryKey: ['extinguishers-options'], queryFn: async () => (await api.get('/extinguishers', { params: { limit: 100 } })).data.data });
  const inspectors = useQuery({ queryKey: ['inspectors'], queryFn: async () => (await api.get('/users/inspectors')).data.data, enabled: isAdmin });

  // Schedule mutation creates user/admin inspection requests.
  const schedule = useMutation({
    mutationFn: (values) => api.post('/inspections', {
      ...values,
      inspectorId: isAdmin ? values.inspectorId : undefined,
    }),
    onSuccess: () => {
      toast.success('Inspection scheduled');
      reset();
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Validation errors'),
  });

  // Completion mutation logs inspection results for assigned work.
  const complete = useMutation({
    mutationFn: ({ id, values }) => api.post(`/inspections/${id}/complete`, values),
    onSuccess: () => {
      toast.success('Inspection completed');
      setCompleting(null);
      resetResult();
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Unauthorized access'),
  });

  // Assignment mutation lets admins assign inspectors after a user schedules inspection.
  const assignInspector = useMutation({
    mutationFn: ({ id, inspectorId }) => api.put(`/inspections/${id}/assign`, { inspectorId }),
    onSuccess: () => {
      toast.success('Inspector assigned');
      setAssignments({});
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Assignment failed'),
  });

  // Derived values shape table rows and role-specific extinguisher choices.
  const rows = inspections.data?.data || [];
  const meta = inspections.data?.meta || { page: 1, totalPages: 1 };
  const isUser = user?.role === 'USER';
  const canSchedule = isAdmin || isUser;
  const extinguisherOptions = isUser
    ? (extinguishers.data || []).filter((e) => e.user?.id === user?.id || e.userId === user?.id)
    : (extinguishers.data || []);

  // Page render shows scheduling, filters, inspection history, assignment, and result modal.
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Inspections</h1>

      {canSchedule && (
        <form onSubmit={handleSubmit((values) => schedule.mutate(values))} className="bg-white border rounded-xl p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <select {...register('extinguisherId')} className="px-4 py-2 border rounded-lg">
            <option value="">Select extinguisher</option>
            {extinguisherOptions.map((e) => <option key={e.id} value={e.id}>{e.serialNumber || e.code} - {e.location}</option>)}
          </select>
          {isAdmin && (
            <select {...register('inspectorId')} className="px-4 py-2 border rounded-lg">
              <option value="">Assign inspector now</option>
              {(inspectors.data || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
          <input type="datetime-local" {...register('scheduledDate')} className="px-4 py-2 border rounded-lg" />
          <input placeholder="Notes" {...register('notes')} className="px-4 py-2 border rounded-lg" />
          <div className="md:col-span-2 text-xs text-red-600">{errors.extinguisherId?.message || errors.scheduledDate?.message}</div>
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
          <thead className="bg-gray-50"><tr><th className="p-3 text-left">Extinguisher</th><th className="p-3 text-left">Date</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Actions</th></tr></thead>
          <tbody className="divide-y">
            {rows.map((i) => (
              <tr key={i.id}>
                <td className="p-3">{i.extinguisher?.serialNumber || i.extinguisher?.code}</td>
                <td className="p-3">{formatDisplayDate(i.scheduledDate)}</td>
                <td className="p-3">{i.status}</td>
                <td className="p-3">
                  {isAdmin && i.status !== 'COMPLETED' && !i.inspectorId && (
                    <div className="flex gap-2">
                      <select value={assignments[i.id] || ''} onChange={(e) => setAssignments({ ...assignments, [i.id]: e.target.value })} className="border rounded px-2 py-1">
                        <option value="">Select inspector</option>
                        {(inspectors.data || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                      <button disabled={!assignments[i.id]} onClick={() => assignInspector.mutate({ id: i.id, inspectorId: assignments[i.id] })} className="text-blue-700 hover:underline disabled:text-gray-400">Assign</button>
                    </div>
                  )}
                  {(isAdmin || isInspector) && i.status !== 'COMPLETED' && i.inspectorId && (
                    <button onClick={() => setCompleting(i)} className="text-green-700 hover:underline">Log Result</button>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="4" className="p-6 text-center text-gray-500">No inspections found.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between mt-4 text-sm"><button disabled={params.page <= 1} onClick={() => setParams({ ...params, page: params.page - 1 })} className="border px-3 py-2 rounded">Previous</button><span>Page {meta.page} of {meta.totalPages || 1}</span><button disabled={params.page >= (meta.totalPages || 1)} onClick={() => setParams({ ...params, page: params.page + 1 })} className="border px-3 py-2 rounded">Next</button></div>
      {completing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleResultSubmit((values) => complete.mutate({ id: completing.id, values }))} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Log Inspection Result</h2>
              <p className="text-sm text-gray-500">{completing.extinguisher?.serialNumber || completing.extinguisher?.code}</p>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...registerResult('pressureOk')} /> Pressure is okay</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...registerResult('pinIntact')} /> Safety pin is intact</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...registerResult('labelReadable')} /> Label is readable</label>
            <textarea placeholder="Issues found" {...registerResult('issuesFound')} className="w-full px-4 py-2 border rounded-lg" />
            <textarea placeholder="Recommendations" {...registerResult('recommendations')} className="w-full px-4 py-2 border rounded-lg" />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setCompleting(null)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg">Save Result</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
