import { formatStatus, statusColor } from '../lib/utils';

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(status)}`}>
      {formatStatus(status)}
    </span>
  );
}
