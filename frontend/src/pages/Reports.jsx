import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api/axios';

const reportTypes = ['inventory', 'inspection', 'compliance', 'maintenance'];

export default function Reports() {
  const inventory = useQuery({ queryKey: ['report', 'inventory'], queryFn: async () => (await api.get('/reports/inventory')).data.data, enabled: false });
  const inspection = useQuery({ queryKey: ['report', 'inspection'], queryFn: async () => (await api.get('/reports/inspection')).data.data, enabled: false });
  const compliance = useQuery({ queryKey: ['report', 'compliance'], queryFn: async () => (await api.get('/reports/compliance')).data.data, enabled: false });
  const maintenance = useQuery({ queryKey: ['report', 'maintenance'], queryFn: async () => (await api.get('/reports/maintenance')).data.data, enabled: false });
  const reports = { inventory, inspection, compliance, maintenance };

  const runReport = async (type) => {
    try {
      await reports[type].refetch();
      toast.success(`${type} report generated`);
    } catch {
      toast.error('Server error');
    }
  };

  const exportReport = (type, format) => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/reports/export.${format}?type=${type.toUpperCase()}&token=${token || ''}`;
    window.open(url, '_blank');
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Reports</h1>
      <p className="text-gray-500 mb-6">Generate real-time inventory, inspection, compliance, and maintenance reports.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportTypes.map((type) => (
          <div key={type} className="bg-white border rounded-xl p-6">
            <h2 className="text-lg font-semibold capitalize">{type} Report</h2>
            <button onClick={() => runReport(type)} className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg">Generate</button>
            <div className="mt-4 flex gap-2">
              <button onClick={() => exportReport(type, 'csv')} className="border px-3 py-2 rounded">CSV</button>
              <button onClick={() => exportReport(type, 'pdf')} className="border px-3 py-2 rounded">PDF</button>
            </div>
            {reports[type].data && (
              <pre className="mt-4 bg-gray-50 rounded p-3 text-xs overflow-auto">{JSON.stringify(reports[type].data, null, 2)}</pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
