import { useEffect, useState } from 'react';
import { Bell, ClipboardCheck, ShieldCheck, TriangleAlert, XCircle } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { isExpiringWithinDays } from '../utils/date';

// Stat cards keep dashboard metrics visually consistent across roles.
function StatCard({ title, value, icon: Icon, color, iconColor }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className={`h-7 w-7 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  // Auth context determines which dashboard title and admin-only actions appear.
  const { user, isAdmin, isInspector } = useAuth();

  // Dashboard state stores summary counts and recent notification rows.
  const [stats, setStats] = useState({ extinguishers: 0, notifications: 0, expired: 0, expiringSoon: 0, pendingInspections: 0 });
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Data loading aggregates multiple microservice responses into dashboard metrics.
  useEffect(() => {
    async function fetchData() {
      try {
        const [extRes, notifRes, complianceRes, inspectionRes] = await Promise.all([
          api.get('/extinguishers', { params: { limit: 100 } }),
          api.get('/notifications', { params: { limit: 100 } }),
          api.get('/reports/compliance').catch(() => ({ data: { data: {} } })),
          api.get('/reports/inspection').catch(() => ({ data: { data: {} } })),
        ]);

        const extinguishers = extRes.data.data;
        const expiringSoon = extinguishers.filter((e) => isExpiringWithinDays(e.expiryDate, 30)).length;

        setStats({
          extinguishers: extinguishers.length,
          notifications: notifRes.data.data.length,
          expired: complianceRes.data.data.expired ?? extinguishers.filter((e) => new Date(e.expiryDate) < new Date()).length,
          expiringSoon,
          pendingInspections: inspectionRes.data.data.pending ?? 0,
        });
        setRecentNotifications(notifRes.data.data.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Loading state keeps the dashboard stable while service calls resolve.
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
      </div>
    );
  }

  // Main dashboard render shows role title, metric cards, notifications, and admin tools.
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {isAdmin ? 'Admin Dashboard' : isInspector ? 'Inspector Dashboard' : 'User Dashboard'}
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Fire Extinguishers" value={stats.extinguishers} icon={ShieldCheck} color="bg-red-50" iconColor="text-red-700" />
        <StatCard title="Expiring Soon" value={stats.expiringSoon} icon={TriangleAlert} color="bg-yellow-50" iconColor="text-yellow-700" />
        <StatCard title="Notifications" value={stats.notifications} icon={Bell} color="bg-blue-50" iconColor="text-blue-700" />
        <StatCard title="Expired" value={stats.expired} icon={XCircle} color="bg-gray-100" iconColor="text-gray-700" />
        <StatCard title="Pending Inspections" value={stats.pendingInspections} icon={ClipboardCheck} color="bg-green-50" iconColor="text-green-700" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Recent Notifications</h2>
        </div>
        {recentNotifications.length === 0 ? (
          <p className="p-6 text-gray-500 text-sm">No notifications yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentNotifications.map((n) => (
              <div key={n.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{n.extinguisher?.code || 'N/A'}</p>
                  <p className="text-xs text-gray-500 truncate">{n.message}</p>
                </div>
                <StatusBadge status={n.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-800">
            <strong>Admin:</strong> You can trigger manual expiry checks from the Notifications page.
          </p>
        </div>
      )}
    </div>
  );
}
