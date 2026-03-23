// src/components/ui/Card.tsx
export function Card({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className ?? ''}`} {...props}>{children}</div>
}
