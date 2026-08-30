import {
  BookOpen,
  Check,
  FileText,
  Filter,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'

import { Panel } from '../components/Panel'
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import type { KnowledgeDocumentDetail } from '../types'
import { formatDateTime } from '../utils/format'

export function KnowledgeBasePage() {
  const { isAdmin } = useAuth()
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selected, setSelected] = useState<KnowledgeDocumentDetail | null>(null)
  const [loadingDoc, setLoadingDoc] = useState(false)

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadType, setUploadType] = useState('SOP')
  const [uploadRefCode, setUploadRefCode] = useState('')
  const [uploadSummary, setUploadSummary] = useState('')
  const [uploadTags, setUploadTags] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Delete State
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const documents = useAsync(
    () => api.listKnowledge(submitted || undefined, selectedType !== 'all' ? selectedType : undefined),
    [submitted, selectedType],
  )

  const open = async (documentId: number) => {
    setLoadingDoc(true)
    try {
      setSelected(await api.getKnowledgeDocument(documentId))
    } catch {
      setSelected(null)
    } finally {
      setLoadingDoc(false)
    }
  }

  const handleFileSelect = (file: File) => {
    setUploadFile(file)
    setUploadError(null)
    if (!uploadTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
      setUploadTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1))
    }
    if (!uploadRefCode) {
      const randNum = Math.floor(10 + Math.random() * 90)
      setUploadRefCode(`SOP-USR-${randNum}`)
    }
  }

  const handleUploadSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!uploadFile) {
      setUploadError('Harap pilih file PDF, Word, atau TXT terlebih dahulu.')
      return
    }

    setUploading(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      if (uploadTitle) formData.append('title', uploadTitle)
      if (uploadType) formData.append('doc_type', uploadType)
      if (uploadRefCode) formData.append('reference_code', uploadRefCode)
      if (uploadSummary) formData.append('summary', uploadSummary)
      if (uploadTags) formData.append('tags', uploadTags)

      const createdDoc = await api.uploadKnowledgeDocument(formData)
      setUploadSuccess(`Dokumen "${createdDoc.title}" berhasil diindeks ke Knowledge Base & RAG!`)
      
      // Reset form
      setUploadFile(null)
      setUploadTitle('')
      setUploadRefCode('')
      setUploadSummary('')
      setUploadTags('')
      if (fileInputRef.current) fileInputRef.current.value = ''

      // Refresh documents list & open new doc
      await documents.reload()
      if (createdDoc && createdDoc.id) {
        await open(createdDoc.id)
      }

      setTimeout(() => {
        setIsUploadOpen(false)
        setUploadSuccess(null)
      }, 1500)
    } catch (err: any) {
      setUploadError(err?.message || 'Gagal mengunggah dan mengekstrak dokumen.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (docId: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus dokumen ini dari Knowledge Base?')) {
      return
    }
    setDeletingId(docId)
    try {
      await api.deleteKnowledgeDocument(docId)
      if (selected?.id === docId) {
        setSelected(null)
      }
      await documents.reload()
    } catch (err: any) {
      alert(`Gagal menghapus dokumen: ${err?.message || 'Terjadi kesalahan'}`)
    } finally {
      setDeletingId(null)
    }
  }

  const DOC_TYPES = [
    'all',
    'SOP',
    'SOP Lapangan',
    'Teori Proses',
    'Riset Prediktif',
    'Kriteria KPI',
    'Rentang Operasi',
    'Troubleshooting',
    'Kasus Historis',
  ]

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100 shadow-xs">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Knowledge Base &amp; SOP ClO₂</h1>
              <p className="text-xs text-slate-500">
                Pustaka RAG standar operasional, teori reaksi kimia, dan model riset industri.
              </p>
            </div>
          </div>

          {/* Action Buttons & Search Box */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                className="field pl-9 w-52 text-xs"
                placeholder="Cari SOP, kinetika, ClO₂…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') setSubmitted(query)
                }}
                aria-label="Cari dokumen"
              />
            </div>
            <button type="button" className="btn-secondary text-xs" onClick={() => setSubmitted(query)}>
              Cari
            </button>

            {/* Upload Document Button for Admins */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsUploadOpen(true)}
                className="btn-primary text-xs inline-flex items-center gap-1.5 shadow-sm"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload Dokumen SOP
              </button>
            )}
          </div>
        </div>

        {/* Filter Type Pills */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Tipe:
          </span>
          {DOC_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedType(t)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                selectedType === t
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'all' ? 'Semua Dokumen' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column Document Explorer */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Panel
          eyebrow="Daftar Dokumen"
          title={`Tersedia (${documents.data?.length ?? 0} Dokumen)`}
          bodyClassName="p-0"
        >
          {documents.loading && !documents.data ? (
            <LoadingState label="Memuat dokumen…" />
          ) : documents.error ? (
            <div className="p-4">
              <ErrorState title="Dokumen tidak dapat dimuat" description={documents.error} />
            </div>
          ) : (documents.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="Dokumen tidak ditemukan"
              description="Coba kata kunci lain atau unggah dokumen SOP baru."
            />
          ) : (
            <ul className="divide-y divide-slate-100 max-h-[580px] overflow-y-auto">
              {documents.data!.map((doc) => (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => void open(doc.id)}
                    className={`w-full px-5 py-4 text-left transition-colors hover:bg-slate-50 ${
                      selected?.id === doc.id
                        ? 'bg-sky-50/80 border-l-4 border-sky-600'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-sky-500 shrink-0" />
                        <span>{doc.title}</span>
                      </p>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 shrink-0">
                        {doc.doc_type}
                      </span>
                    </div>
                    {doc.summary && (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                        {doc.summary}
                      </p>
                    )}
                    <p className="mt-2 font-mono text-[10px] text-slate-400">
                      {doc.reference_code ?? '—'} · v{doc.version ?? '1.0'} · {formatDateTime(doc.updated_at)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          eyebrow="Isi Dokumen"
          title={selected?.title ?? 'Pilih dokumen dari daftar'}
          action={
            isAdmin && selected ? (
              <button
                type="button"
                onClick={() => handleDelete(selected.id)}
                disabled={deletingId === selected.id}
                title="Hapus Dokumen dari RAG"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : undefined
          }
        >
          {loadingDoc ? (
            <LoadingState label="Membuka dokumen…" />
          ) : !selected ? (
            <EmptyState
              title="Belum ada dokumen dipilih"
              description="Pilih salah satu dokumen di sebelah kiri untuk menelaah rincian SOP atau riset."
            />
          ) : (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-100 text-xs">
                <div>
                  <dt className="text-[10px] font-bold uppercase text-slate-400">Kode Dokumen</dt>
                  <dd className="font-mono font-bold text-slate-800 mt-0.5">
                    {selected.reference_code ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-slate-400">Jenis Dokumen</dt>
                  <dd className="font-semibold text-slate-800 mt-0.5">{selected.doc_type}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-slate-400">Versi</dt>
                  <dd className="font-mono text-slate-800 mt-0.5">v{selected.version ?? '1.0'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-slate-400">Diperbarui</dt>
                  <dd className="text-slate-800 mt-0.5">{formatDateTime(selected.updated_at)}</dd>
                </div>
              </dl>

              <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs">
                <p className="whitespace-pre-line text-xs sm:text-sm leading-relaxed text-slate-800 font-sans">
                  {selected.content ?? 'Dokumen belum memiliki isi.'}
                </p>
              </div>

              {selected.tags?.length ? (
                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                  <Tag className="h-3.5 w-3.5 text-slate-400" />
                  {selected.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </Panel>
      </div>

      {/* UPLOAD DOCUMENT MODAL */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Upload Dokumen SOP ke RAG</h3>
                  <p className="text-xs text-slate-500">Mendukung file PDF, Word (.docx), TXT, dan Markdown.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
              {uploadError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-700">
                  ✕ {uploadError}
                </div>
              )}
              {uploadSuccess && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-700 flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50/50 hover:bg-sky-50/80 rounded-xl p-5 text-center cursor-pointer transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0])
                    }
                  }}
                />
                <FileText className="mx-auto h-8 w-8 text-sky-500 mb-2" />
                {uploadFile ? (
                  <div>
                    <p className="text-xs font-bold text-slate-900">{uploadFile.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {(uploadFile.size / 1024).toFixed(1)} KB · Klik untuk mengganti file
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Klik atau seret file PDF / Word / TXT ke sini
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Format didukung: PDF, Word (.docx), Plaintext (.txt), Markdown (.md)
                    </p>
                  </div>
                )}
              </div>

              {/* Form Metadata Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Judul Dokumen *
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Contoh: Prosedur Reaksi Generator"
                    className="field text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Jenis Dokumen *
                  </label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="field text-xs"
                  >
                    <option value="SOP">SOP</option>
                    <option value="Troubleshooting">Troubleshooting</option>
                    <option value="Teori Proses">Teori Proses</option>
                    <option value="Kriteria KPI">Kriteria KPI</option>
                    <option value="SOP Lapangan">SOP Lapangan</option>
                    <option value="Riset Prediktif">Riset Prediktif</option>
                    <option value="Kasus Historis">Kasus Historis</option>
                    <option value="Rentang Operasi">Rentang Operasi</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Kode Referensi Dokumen
                  </label>
                  <input
                    type="text"
                    value={uploadRefCode}
                    onChange={(e) => setUploadRefCode(e.target.value)}
                    placeholder="Contoh: SOP-CLO2-GEN01"
                    className="field font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Tag / Kata Kunci (Dipisah Koma)
                  </label>
                  <input
                    type="text"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    placeholder="hcl, naclo3, suhu, chiller"
                    className="field text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Ringkasan Eksekutif (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={uploadSummary}
                  onChange={(e) => setUploadSummary(e.target.value)}
                  placeholder="Ringkasan singkat isi dokumen untuk mempercepat pencarian AI..."
                  className="field text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="btn-primary text-xs inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? 'Mengekstrak & Mengindeks…' : 'Ekstrak & Simpan ke RAG'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
