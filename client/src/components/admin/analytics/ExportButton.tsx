import { DownloadIcon } from '../../../assets/icons'
import { downloadAnalyticsCsv } from './analyticsExport'
import type { AdminAnalytics } from '../../../services/adminService'

export function ExportButton({ analytics }: { analytics: AdminAnalytics | null }) {
  return (
    <button
      className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-xs font-bold text-green-dark transition-colors hover:border-green hover:text-green disabled:cursor-not-allowed disabled:opacity-50"
      type="button"
      disabled={!analytics}
      onClick={() => {
        if (analytics) downloadAnalyticsCsv(analytics)
      }}
    >
      <DownloadIcon size={14} />
      Export CSV
    </button>
  )
}