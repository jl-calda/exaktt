// Legacy redirect — /mto/system/[id] → /products/[id]
import { redirect } from 'next/navigation'
interface Props { params: Promise<{ id: string }> }
export default async function MtoSystemRedirect({ params }: Props) {
  const { id } = await params
  redirect('/products/' + id)
}
