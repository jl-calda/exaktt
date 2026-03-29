// Legacy redirect — /mto → /products
import { redirect } from 'next/navigation'
export default function MtoRedirect() { redirect('/products') }
