'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { newsDraftSchema, type NewsDraftValues } from '@/lib/validations/news'
import { useT } from '@/lib/i18n/client'
import type { Locale } from '@/lib/i18n'
import { NewsPreviewModal } from './news-preview-modal'

// 2 MB cap mirrors the server-side cap in uploadNewsImage (storage.ts).
const MAX_IMAGE_BYTES = 2 * 1024 * 1024

// =============================================================================
// NewsForm — shared create/edit form
// -----------------------------------------------------------------------------
// Layout (top → bottom):
//   1. Error banner (state.error from the server action result)
//   2. Image section (file input ABOVE the tabs — D-01: one shared image)
//   3. Content section: NL/EN/Hindi tab strip + 6 inputs (all always-mounted via
//      `hidden` for inactive tabs — preserves entered values across tab switches)
//   4. Sticky action bar: Preview button + Save Draft submit button
//   5. Preview modal (state-driven)
//
// Critical contracts:
// - The file input carries a literal name attribute (image) — the server
//   actions (createNewsItem / updateNewsItem) read it via formData.get('image').
// - The 6 text inputs use react-hook-form's register() — single source of truth
//   for the field name attribute. Server actions read formData.get('title_nl'), etc.
// - This form ONLY saves drafts. Publish / Withdraw live on news-card and the
//   edit-page action panel (09-05). No publish button here.
// =============================================================================

interface NewsFormProps {
  action: (prevState: { error: string }, formData: FormData) => Promise<{ error: string }>
  defaultValues?: Partial<NewsDraftValues>
  currentImageUrl?: string | null
  isEditing?: boolean
}

export function NewsForm({
  action,
  defaultValues,
  currentImageUrl,
  isEditing = false,
}: NewsFormProps) {
  const t = useT()
  const [state, formAction, pending] = useActionState(action, { error: '' })

  const {
    register,
    watch,
    formState: { errors },
  } = useForm<NewsDraftValues>({
    resolver: zodResolver(newsDraftSchema),
    defaultValues: {
      title_nl: defaultValues?.title_nl ?? '',
      title_en: defaultValues?.title_en ?? '',
      title_hi: defaultValues?.title_hi ?? '',
      body_nl: defaultValues?.body_nl ?? '',
      body_en: defaultValues?.body_en ?? '',
      body_hi: defaultValues?.body_hi ?? '',
    },
  })

  const [activeLang, setActiveLang] = useState<Locale>('nl')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Revoke any object URL when the component unmounts to avoid leaks.
  useEffect(() => {
    return () => {
      if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl)
    }
  }, [imageObjectUrl])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) {
      if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl)
      setImageObjectUrl(null)
      setImageError(null)
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError(t('operator.news.fieldImageHint'))
      // Reset the input so the form does not submit an oversize file
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl)
      setImageObjectUrl(null)
      return
    }
    setImageError(null)
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl)
    setImageObjectUrl(URL.createObjectURL(file))
  }

  // Live snapshot for the preview modal — read every relevant field on every render.
  const watched = watch()
  const watchedValues = {
    title_nl: watched.title_nl ?? '',
    title_en: watched.title_en ?? '',
    title_hi: watched.title_hi ?? '',
    body_nl: watched.body_nl ?? '',
    body_en: watched.body_en ?? '',
    body_hi: watched.body_hi ?? '',
  }

  const previewImageUrl = imageObjectUrl ?? currentImageUrl ?? null

  const tabLabels: Record<Locale, string> = {
    nl: t('operator.news.tabNl'),
    en: t('operator.news.tabEn'),
    hi: t('operator.news.tabHi'),
  }

  const langs: Locale[] = ['nl', 'en', 'hi']

  return (
    <>
      <form action={formAction} className="space-y-8">
        {state?.error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
            <span>{state.error}</span>
          </div>
        )}

        {/* =============================================================== */}
        {/* IMAGE SECTION — lives ABOVE the tabs (one shared image, D-01)   */}
        {/* =============================================================== */}
        <FormSection
          title={t('operator.news.sectionImage')}
          description={t('operator.news.sectionImageDescription')}
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
          }
        >
          <div className="flex items-start gap-4">
            {previewImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewImageUrl}
                alt=""
                className="h-20 w-32 flex-shrink-0 rounded-lg object-cover ring-1 ring-gray-200"
              />
            )}
            <div className="min-w-0 flex-1">
              <label
                htmlFor="news-image-input"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600"
              >
                {t('operator.news.fieldImage')}
              </label>
              <input
                ref={fileInputRef}
                id="news-image-input"
                type="file"
                name="image"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-700 file:hover:bg-indigo-100"
              />
              <p className="mt-1.5 text-[11px] text-gray-400">
                {t('operator.news.fieldImageHint')}
              </p>
              {imageError && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                    />
                  </svg>
                  {imageError}
                </p>
              )}
            </div>
          </div>
        </FormSection>

        {/* =============================================================== */}
        {/* CONTENT SECTION — NL/EN/Hindi tab strip + 6 inputs              */}
        {/* All 6 inputs are always mounted (hidden for inactive tabs)      */}
        {/* so RHF's form state survives tab switches.                      */}
        {/* =============================================================== */}
        <FormSection
          title={t('operator.news.sectionContent')}
          description={t('operator.news.sectionContentDescription')}
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-1 self-start rounded-full border border-gray-200 bg-gray-50 p-1 sm:w-fit">
              {langs.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveLang(lang)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                    activeLang === lang
                      ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tabLabels[lang]}
                </button>
              ))}
            </div>

            {langs.map((lang) => (
              <div key={lang} className={lang === activeLang ? 'space-y-4' : 'hidden'}>
                <Field
                  label={t('operator.news.fieldTitle')}
                  id={`title_${lang}`}
                  error={errors[`title_${lang}` as const]?.message}
                >
                  <input
                    id={`title_${lang}`}
                    type="text"
                    maxLength={200}
                    {...register(`title_${lang}` as const)}
                    className={inputClass(!!errors[`title_${lang}` as const])}
                  />
                </Field>
                <Field
                  label={t('operator.news.fieldBody')}
                  id={`body_${lang}`}
                  error={errors[`body_${lang}` as const]?.message}
                >
                  <textarea
                    id={`body_${lang}`}
                    rows={10}
                    maxLength={10000}
                    {...register(`body_${lang}` as const)}
                    className={inputClass(!!errors[`body_${lang}` as const]) + ' resize-y'}
                  />
                </Field>
              </div>
            ))}
          </div>
        </FormSection>

        {/* =============================================================== */}
        {/* STICKY ACTION BAR — Preview + Save Draft                        */}
        {/* =============================================================== */}
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white/95 p-3 pl-5 shadow-lg backdrop-blur">
          <p className="text-xs text-gray-500">
            {isEditing
              ? t('operator.news.saveSuccess')
              : t('operator.news.sectionContentDescription')}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              {t('operator.news.previewButton')}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-600/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {pending ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  {t('operator.news.saving')}
                </>
              ) : (
                t('operator.news.saveDraft')
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Preview modal — lives outside the form so it doesn't submit on inner clicks */}
      <NewsPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        imageUrl={previewImageUrl}
        values={watchedValues}
        initialLanguage={activeLang}
      />
    </>
  )
}

// =============================================================================
// Local styling helpers — mirror client-form.tsx (FormSection / Field / inputClass).
// Inlined here to keep news-form.tsx self-contained; the visual vocabulary is
// the same so the operator panel feels consistent.
// =============================================================================

function inputClass(hasError: boolean) {
  return `block w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-all focus:outline-none focus:ring-4 ${
    hasError
      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
      : 'border-gray-200 focus:border-indigo-400 focus:ring-indigo-100'
  }`
}

function FormSection({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start gap-3 border-b border-gray-100 pb-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 ring-1 ring-indigo-100">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  id,
  hint,
  error,
  children,
}: {
  label: string
  id: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            {label}
          </label>
          {hint && !error && <span className="text-[11px] text-gray-400">{hint}</span>}
        </div>
      )}
      {children}
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}
