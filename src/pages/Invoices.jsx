import { PageHead } from '../components/ui.jsx'
import { InvoicesTab } from '../components/Invoices.jsx'

/* Invoices used to be a tab inside Finance. Alex asked for it in the sidebar of its own, so it
   is a page now and Finance no longer carries it. The work itself is unchanged: this is the same
   InvoicesTab, in a page instead of a tab. The invoice profile (company details, numbering, bank)
   stays in Finance > Settings, where the rest of the money settings are. */
export default function Invoices() {
  return (
    <>
      <PageHead title="Invoices" sub="What the company has billed, and what is still to be paid." />
      <InvoicesTab />
    </>
  )
}
