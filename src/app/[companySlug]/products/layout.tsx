import ProductsSidebar from '@/components/products/ProductsSidebar'

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row" style={{ minHeight: '100%' }}>
      <ProductsSidebar />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
