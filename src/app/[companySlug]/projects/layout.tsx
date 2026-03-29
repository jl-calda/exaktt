import ProjectsSidebar from '@/components/projects/ProjectsSidebar'

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row" style={{ minHeight: '100%' }}>
      <ProjectsSidebar />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
