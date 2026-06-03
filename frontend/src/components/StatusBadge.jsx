const statusStyles = {
  SENT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  RESPONDED: 'bg-green-100 text-green-800 border-green-200',
  IGNORED: 'bg-orange-100 text-orange-800 border-orange-200',
  ESCALATED: 'bg-red-100 text-red-800 border-red-200',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
