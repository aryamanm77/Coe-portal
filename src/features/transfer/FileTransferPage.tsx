import { useState } from 'react'
import { FileDown, Package } from 'lucide-react'
import { Tabs } from '../../components/ui/Tabs'
import { SimNotice } from '../../components/ui/Misc'
import { ExportTab } from './ExportTab'
import { ImportTab } from './ImportTab'

export function FileTransferPage() {
  const [tab, setTab] = useState('export')

  return (
    <div className="space-y-6">
      <div className="max-w-3xl space-y-3">
        <p className="text-sm text-muted">
          The real-world flow is: export a sealed exam package → carry it to the lab server on a pen drive → the server
          checks it was not tampered with → import the verified result file without duplicates.
        </p>
        <SimNotice title="Everything on this page is a simulation" tone="warn">
          Packages and result files are plain JSON handled in your browser. The portal cannot detect a pen drive, reach a
          lab server, create real signatures, or verify real file integrity.
        </SimNotice>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'export', label: 'Export Exam Package', icon: <Package className="h-4 w-4" aria-hidden="true" /> },
          { id: 'import', label: 'Import Results', icon: <FileDown className="h-4 w-4" aria-hidden="true" /> },
        ]}
      >
        {tab === 'export' ? <ExportTab /> : <ImportTab />}
      </Tabs>
    </div>
  )
}
