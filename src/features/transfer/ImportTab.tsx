import { useMemo, useRef, useState, type DragEvent } from 'react'
import { CheckCircle2, Download, FileJson, MinusCircle, ShieldAlert, UploadCloud, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Field, SelectInput } from '../../components/ui/Field'
import { EmptyState, SimNotice, TableWrap, Td, Th } from '../../components/ui/Misc'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useToast } from '../../components/ui/Toast'
import {
  buildSampleResultFile,
  sampleFileName,
  validateResultFile,
  type ImportValidation,
} from '../../lib/resultFile'
import { cx, downloadFile, formatDateTime, formatDate, totalQuestions } from '../../lib/utils'
import { useApp } from '../../store/AppStore'

interface Loaded {
  fileName: string
  size: number
  validation: ImportValidation
}

const MAX_BYTES = 2 * 1024 * 1024

export function ImportTab() {
  const { exams, resultSets, importResults } = useApp()
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [justImported, setJustImported] = useState<string | null>(null)

  const sampleable = useMemo(() => exams.filter((e) => !!e.packageId), [exams])
  const [sampleId, setSampleId] = useState('')
  const sample = sampleable.find((e) => e.id === sampleId) ?? sampleable.find((e) => e.status === 'Package Exported') ?? sampleable[0]

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return
    setJustImported(null)
    const text = file.size <= MAX_BYTES ? await file.text() : ''
    setLoaded({
      fileName: file.name,
      size: file.size,
      validation: validateResultFile(text, file.name, file.size, exams, resultSets),
    })
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    void handleFile(e.dataTransfer.files?.[0])
  }

  const v = loaded?.validation
  const failed = v ? v.checks.filter((c) => c.state === 'fail').length : 0

  const doImport = () => {
    if (!loaded || !v?.ok || !v.exam || !v.students || !v.answerKey || !v.importBatchId) return
    const rs = importResults({
      examId: v.exam.id,
      fileName: loaded.fileName,
      importBatchId: v.importBatchId,
      answerKey: v.answerKey,
      students: v.students,
    })
    if (!rs) {
      toast('Import blocked: these results look like a duplicate.', 'error')
      return
    }
    setJustImported(v.exam.id)
    setLoaded(null)
    if (inputRef.current) inputRef.current.value = ''
    toast(`Imported ${rs.students.length} student records for ${v.exam.subject}. Exam status is now Results Imported.`)
  }

  const reset = () => {
    setLoaded(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const downloadSample = (tamper: boolean) => {
    if (!sample) return
    downloadFile(sampleFileName(sample, tamper), buildSampleResultFile(sample, tamper))
    toast(
      tamper
        ? 'Tampered sample downloaded. Upload it to see the integrity check fail.'
        : 'Sample result file downloaded. Upload it to try the import.',
      'info',
    )
  }

  return (
    <div className="space-y-6">
      <SimNotice title="Integrity check simulation" tone="warn">
        The portal compares a simple demo checksum stored in the file. This is not a digital-signature check, does not
        prove who produced the file, and cannot detect a determined attacker. Duplicate protection only looks at records
        stored in this browser.
      </SimNotice>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="1 · Upload a result file" description="JSON only, up to 2 MB." />
            <CardBody>
              <label
                htmlFor="result-file"
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cx(
                  'flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600',
                  dragging ? 'border-navy bg-navsel' : 'border-slate-300 bg-slate-50 hover:border-navy-2 hover:bg-navsel/60',
                )}
              >
                <UploadCloud className="mb-3 h-8 w-8 text-navy-2" aria-hidden="true" />
                <span className="text-sm font-semibold text-navy">Drag &amp; drop a result .json file here</span>
                <span className="mt-1 text-[13px] text-muted">or choose a file from your computer</span>
                <span className="mt-4">
                  <Button variant="secondary" onClick={() => inputRef.current?.click()} tabIndex={-1}>
                    Choose file
                  </Button>
                </span>
                <input
                  ref={inputRef}
                  id="result-file"
                  type="file"
                  accept=".json,application/json"
                  className="sr-only"
                  onChange={(e) => void handleFile(e.target.files?.[0])}
                />
              </label>

              {justImported && (
                <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-ctl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Import complete. Review the results and publish
                    them when ready.
                  </span>
                  <Link to="/results" className="font-semibold underline underline-offset-2">
                    Go to Results &amp; Publishing
                  </Link>
                </div>
              )}
            </CardBody>
          </Card>

          {loaded && v && (
            <Card>
              <CardHeader
                title="2 · Verification (simulated)"
                description={`${loaded.fileName} · ${(loaded.size / 1024).toFixed(1)} KB`}
                actions={
                  <Button size="sm" variant="ghost" onClick={reset}>
                    Clear
                  </Button>
                }
              />
              <CardBody className="space-y-5">
                <ul className="divide-y divide-line rounded-ctl border border-line">
                  {v.checks.map((c) => (
                    <li key={c.id} className="flex items-start gap-3 px-4 py-3">
                      {c.state === 'pass' ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" aria-hidden="true" />
                      ) : c.state === 'fail' ? (
                        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
                      ) : (
                        <MinusCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                          {c.label}
                          <span
                            className={cx(
                              'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                              c.state === 'pass' && 'border-green-200 bg-green-50 text-green-800',
                              c.state === 'fail' && 'border-red-200 bg-red-50 text-red-800',
                              c.state === 'skipped' && 'border-slate-300 bg-slate-100 text-slate-700',
                            )}
                          >
                            {c.state === 'pass' ? 'Passed' : c.state === 'fail' ? 'Failed' : 'Not checked'}
                          </span>
                        </p>
                        {c.detail && <p className="mt-0.5 break-words text-[13px] text-muted">{c.detail}</p>}
                      </div>
                    </li>
                  ))}
                </ul>

                {!v.ok && (
                  <div role="alert" className="flex gap-2 rounded-ctl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-900">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p>
                      <span className="font-semibold">Import blocked.</span> {failed} check{failed === 1 ? '' : 's'} failed.
                      Nothing was imported. Fix the file (or download a fresh sample) and upload it again.
                    </p>
                  </div>
                )}

                {v.ok && v.exam && v.students && (
                  <ImportPreview examName={`${v.exam.subject} (${v.exam.classSection}, ${v.exam.examType})`} maxMarks={totalQuestions(v.exam)} students={v.students} />
                )}

                <div className="flex flex-wrap gap-2">
                  <Button disabled={!v.ok} onClick={doImport}>
                    Import results (simulated)
                  </Button>
                  <Button variant="secondary" onClick={reset}>
                    Cancel
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        <aside aria-label="Sample files" className="xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardHeader title="Sample result files" description="Generated locally for trying the import." />
            <CardBody className="space-y-4">
              {sampleable.length === 0 || !sample ? (
                <p className="text-[13px] text-muted">
                  Export a package first (Export Exam Package tab). Sample files are generated for exams that have a
                  package ID so the IDs match.
                </p>
              ) : (
                <>
                  <Field label="Generate sample for">
                    <SelectInput value={sample.id} onChange={(e) => setSampleId(e.target.value)}>
                      {sampleable.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.subject} · {e.classSection} · {e.examType} ({e.status})
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <div className="flex flex-col gap-2">
                    <Button variant="secondary" icon={<Download className="h-4 w-4" aria-hidden="true" />} onClick={() => downloadSample(false)}>
                      Download sample result file
                    </Button>
                    <Button variant="ghost" icon={<FileJson className="h-4 w-4" aria-hidden="true" />} onClick={() => downloadSample(true)}>
                      Download tampered sample
                    </Button>
                  </div>
                  <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted">
                    <li>The normal sample passes every check.</li>
                    <li>The tampered sample was edited after its checksum was made, so verification fails.</li>
                    <li>Importing the same file twice is blocked as a duplicate.</li>
                    {sample.status !== 'Package Exported' && (
                      <li className="text-amber-900">
                        This exam is already “{sample.status}”, so importing its sample will be blocked as a duplicate.
                      </li>
                    )}
                  </ul>
                </>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>

      <Card>
        <CardHeader title="Import history" description="Result files imported in this browser." />
        {resultSets.length === 0 ? (
          <EmptyState icon={FileJson} title="Nothing imported yet">
            Imported result files will be listed here.
          </EmptyState>
        ) : (
          <TableWrap caption="Import history">
            <thead>
              <tr>
                <Th>File</Th>
                <Th>Exam</Th>
                <Th>Imported</Th>
                <Th>Students</Th>
                <Th>Batch ID</Th>
                <Th>Publication</Th>
              </tr>
            </thead>
            <tbody>
              {[...resultSets]
                .sort((a, b) => b.importedAt.localeCompare(a.importedAt))
                .map((r) => {
                  const e = exams.find((x) => x.id === r.examId)
                  const present = r.students.filter((s) => s.status === 'Present').length
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <Td className="font-mono text-[13px]">{r.fileName}</Td>
                      <Td>
                        <p className="font-medium">{e?.subject ?? r.examId}</p>
                        <p className="text-xs text-muted">{e ? `${e.classSection} · ${e.examType} · ${formatDate(e.date)}` : ''}</p>
                      </Td>
                      <Td>{formatDateTime(r.importedAt)}</Td>
                      <Td>
                        {r.students.length}{' '}
                        <span className="text-xs text-muted">
                          ({present} present, {r.students.length - present} absent)
                        </span>
                      </Td>
                      <Td className="font-mono text-xs">{r.importBatchId}</Td>
                      <Td>
                        <StatusBadge status={r.publications.length ? 'Published' : 'Not published'} />
                      </Td>
                    </tr>
                  )
                })}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </div>
  )
}

function ImportPreview({
  examName,
  maxMarks,
  students,
}: {
  examName: string
  maxMarks: number
  students: Array<{ usn: string; name: string; status: 'Present' | 'Absent'; marks: number | null }>
}) {
  const present = students.filter((s) => s.status === 'Present').length
  return (
    <div>
      <p className="text-sm font-medium text-navy">Preview — {examName}</p>
      <p className="mt-0.5 text-[13px] text-muted">
        {students.length} students · {present} present · {students.length - present} absent
      </p>
      <TableWrap caption="Result preview (first 6 students)" className="mt-3 rounded-ctl border border-line">
        <thead>
          <tr>
            <Th>USN</Th>
            <Th>Name</Th>
            <Th>Attendance</Th>
            <Th>Marks (/{maxMarks})</Th>
          </tr>
        </thead>
        <tbody>
          {students.slice(0, 6).map((s) => (
            <tr key={s.usn}>
              <Td className="font-mono text-[13px]">{s.usn}</Td>
              <Td>{s.name}</Td>
              <Td>
                <StatusBadge status={s.status} />
              </Td>
              <Td>{s.marks ?? '—'}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      {students.length > 6 && <p className="mt-1.5 text-xs text-muted">…and {students.length - 6} more.</p>}
    </div>
  )
}
