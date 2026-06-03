import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function Notifications() {
  // Auth state controls admin-only manual expiry checks.
  const { isAdmin } = useAuth();

  // Notification state tracks list data, loading state, trigger state, and pagination.
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });

  // Fetches paginated notifications for the current page.
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications', { params: { page, limit: 10 } });
      setNotifications(res.data.data);
      setMeta(res.data.meta || { page: 1, totalPages: 1 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Reload notifications whenever the page changes.
  useEffect(() => { fetchNotifications(); }, [page]);

  // Marks a pending notification as responded by the current user.
  const handleRespond = async (id) => {
    try {
      await api.post(`/notifications/respond/${id}`);
      toast.success('Record updated');
      fetchNotifications();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Server error');
    }
  };

  // Admin action triggers the backend expiry scan and refreshes the list.
  const handleTriggerCheck = async () => {
    setTriggering(true);
    try {
      await api.post('/notifications/trigger-check');
      fetchNotifications();
      toast.success('Record added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Server error');
    } finally {
      setTriggering(false);
    }
  };

  // Page render shows status legend, notification cards, admin trigger, and pagination.
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
        </div>
        {isAdmin && (
          <button onClick={handleTriggerCheck} disabled={triggering}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {triggering ? 'Running...' : 'Trigger Expiry Check'}
          </button>
        )}
      </div>

      <div className="flex gap-3 mb-6 text-xs">
        <span className="flex items-center gap-1"><StatusBadge status="SENT" /> Pending</span>
        <span className="flex items-center gap-1"><StatusBadge status="RESPONDED" /> Responded</span>
        <span className="flex items-center gap-1"><StatusBadge status="IGNORED" /> Ignored</span>
      </div>

      {loading ? (
        <div className="flex justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" /></div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-500">
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((n) => (
            <div key={n.id} className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">{n.extinguisher?.code || 'Unknown'}</h3>
                    <StatusBadge status={n.status} />
                  </div>
                  <p className="text-sm text-gray-600">{n.message}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>Sent: {new Date(n.sentAt).toLocaleString()}</span>
                    {n.respondedAt && <span>Responded: {new Date(n.respondedAt).toLocaleString()}</span>}
                  </div>
                </div>
                {n.status === 'SENT' && (
                  <button onClick={() => handleRespond(n.id)}
                    className="shrink-0 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    Respond
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-4 text-sm">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="border px-3 py-2 rounded disabled:opacity-50">Previous</button>
        <span>Page {meta.page} of {meta.totalPages || 1}</span>
        <button disabled={page >= (meta.totalPages || 1)} onClick={() => setPage(page + 1)} className="border px-3 py-2 rounded disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
