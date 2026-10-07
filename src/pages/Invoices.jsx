import { Navigate } from 'react-router-dom'
import { PageHead } from '../components/ui.jsx'
import { InvoicesTab } from '../components/Invoices.jsx'
import { useCurrentUser } from '../lib/store.jsx'

/* Invoices used to be a tab inside Finance. Alex asked for it in the sidebar of its own, so it
   is a page now and Finance no longer carries it. The work itself is unchanged: this is the same
   InvoicesTab, in a page instead of a tab. The invoice profile (company details, numbering, bank)
   stays in Finance > Settings, where the rest of the money settings are.

   Administrators only, the same as Finance. The sidebar already hides it from everyone else, but
   a page has to refuse on its own too, or a member who types /invoices gets the empty page and an
   invoice form. The invoices themselves never reach a member either way: they are rows in the
   finance table, which the database serves to administrators only (supabase/finance.sql). */
export default function Invoices() {
  const me = useCurrentUser()
  if (me?.role !== 'admin') return <Navigate to="/" replace />
  return (
    <>
      <PageHead title="Invoices" sub="What the company has billed, and what is still to be paid." />
      <InvoicesTab />
    </>
  )
}
