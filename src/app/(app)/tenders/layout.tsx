import TendersSidebar from '@/components/tenders/TendersSidebar'

export default function TendersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row" style={{ minHeight: '100%' }}>
      <TendersSidebar />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
