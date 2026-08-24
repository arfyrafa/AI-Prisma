import { BookOpen, FileText, Filter, Search, Tag } from 'lucide-react'
import { useState } from 'react'

import { Panel } from '../components/Panel'
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import type { KnowledgeDocumentDetail } from '../types'
import { formatDateTime } from '../utils/format'

export function KnowledgeBasePage() {
 const [query, setQuery] = useState('')
 const [submitted, setSubmitted] = useState('')
 const [selectedType, setSelectedType] = useState<string>('all')
 const [selected, setSelected] = useState<KnowledgeDocumentDetail | null>(null)
 const [loadingDoc, setLoadingDoc] = useState(false)

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
 <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
 <BookOpen className="h-5 w-5" />
 </div>
 <div>
 <h1 className="text-xl font-bold text-slate-900">Knowledge Base &amp; SOP ClO₂</h1>
 <p className="text-xs text-slate-500">
 Pustaka standar operasional, teori reaksi kimia, dan model riset prediksi industri.
 </p>
 </div>
 </div>

 {/* Search Box */}
 <div className="flex items-center gap-2">
 <div className="relative">
 <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
 <input
 className="field pl-9 w-60 text-xs"
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
 : 'bg-slate-100 text-slate-600 hover:bg-slate-200:bg-slate-700'
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
 description="Coba kata kunci lain atau pilih kategori Semua Dokumen."
 />
 ) : (
 <ul className="divide-y divide-slate-100 max-h-[580px] overflow-y-auto">
 {documents.data!.map((doc) => (
 <li key={doc.id}>
 <button
 type="button"
 onClick={() => void open(doc.id)}
 className={`w-full px-5 py-4 text-left transition-colors hover:bg-slate-50:bg-slate-800/60 ${
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

 <Panel eyebrow="Isi Dokumen" title={selected?.title ?? 'Pilih dokumen dari daftar'}>
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
 </div>
 )
}
