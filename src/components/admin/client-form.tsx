'use client'

import { useActionState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { clientFormSchema, clientEditSchema, type ClientFormValues, type ClientEditValues } from '@/lib/validations/client'
import { ColorPicker } from './color-picker'
import { LogoUpload } from './logo-upload'

interface ClientFormProps {
  action: (prevState: { error: string }, formData: FormData) => Promise<{ error: string }>
  defaultValues?: Partial<ClientFormValues>
  currentLogoUrl?: string | null
  isEditing?: boolean
  originalEmail?: string
}

export function ClientForm({
  action,
  defaultValues,
  currentLogoUrl,
  isEditing = false,
  originalEmail,
}: ClientFormProps) {
  const [state, formAction, pending] = useActionState(action, { error: '' })

  const schema = isEditing ? clientEditSchema : clientFormSchema
  const {
    register,
    formState: { errors },
  } = useForm<ClientFormValues | ClientEditValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: defaultValues?.companyName ?? '',
      email: defaultValues?.email ?? '',
      password: defaultValues?.password ?? '',
      primaryColor: defaultValues?.primaryColor ?? '#3B82F6',
      isRecruitment: defaultValues?.isRecruitment ?? false,
      meetingUrl: defaultValues?.meetingUrl ?? '',
      inboxUrl: defaultValues?.inboxUrl ?? '',
      inboxVisible: defaultValues?.inboxVisible ?? false,
      chatInboxVisible: defaultValues?.chatInboxVisible ?? true,
      instantlyApiKey: defaultValues?.instantlyApiKey ?? '',
    },
  })

  return (
    <form action={formAction} className="space-y-8">
      {state?.error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <span>{state.error}</span>
        </div>
      )}

      {isEditing && originalEmail && (
        <input type="hidden" name="originalEmail" value={originalEmail} />
      )}

      {/* Section: Basis */}
      <FormSection
        title="Basisgegevens"
        description="Bedrijfsinformatie en logingegevens voor deze klant."
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
          </svg>
        }
      >
        <Field
          label="Bedrijfsnaam"
          id="companyName"
          error={errors.companyName?.message}
        >
          <input
            id="companyName"
            type="text"
            placeholder="Acme BV"
            {...register('companyName')}
            className={inputClass(!!errors.companyName)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Login e-mailadres"
            id="email"
            hint="Waarmee de klant inlogt"
            error={errors.email?.message}
          >
            <input
              id="email"
              type="email"
              placeholder="klant@bedrijf.nl"
              {...register('email')}
              className={inputClass(!!errors.email)}
            />
          </Field>

          <Field
            label="Wachtwoord"
            id="password"
            hint={isEditing ? 'Leeg laten om niet te wijzigen' : 'Wordt aan de klant gedeeld'}
            error={errors.password?.message}
          >
            <input
              id="password"
              type="text"
              placeholder="••••••••"
              {...register('password')}
              className={inputClass(!!errors.password) + ' font-mono'}
            />
          </Field>
        </div>

        <Field label="" id="isRecruitment">
          <Toggle
            id="isRecruitment"
            name="isRecruitment"
            defaultChecked={defaultValues?.isRecruitment ?? false}
            label="Recruitment klant"
            description="Activeert recruitment-specifieke features in het dashboard."
          />
        </Field>
      </FormSection>

      {/* Section: Branding */}
      <FormSection
        title="Branding"
        description="Visuele uitstraling van het klantdashboard."
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" />
          </svg>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorPicker
            name="primaryColor"
            defaultValue={defaultValues?.primaryColor ?? '#3B82F6'}
          />
          <LogoUpload currentLogoUrl={currentLogoUrl} />
        </div>
      </FormSection>

      {/* Section: Integraties */}
      <FormSection
        title="Integraties"
        description="Instantly workspace koppeling en externe links."
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
          </svg>
        }
      >
        <Field
          label="Instantly inbox URL"
          id="inboxUrl"
          hint="Waar de klant naartoe gaat voor hun inbox"
          error={errors.inboxUrl?.message}
        >
          <input
            id="inboxUrl"
            type="url"
            placeholder="https://app.instantly.ai/..."
            {...register('inboxUrl')}
            className={inputClass(!!errors.inboxUrl)}
          />
        </Field>

        <Field
          label="Instantly API Key"
          id="instantlyApiKey"
          hint="API key van de workspace van deze klant"
        >
          <input
            id="instantlyApiKey"
            type="password"
            placeholder="••••••••"
            {...register('instantlyApiKey')}
            className={inputClass(false) + ' font-mono'}
          />
        </Field>
      </FormSection>

      {/* Section: Zichtbaarheid */}
      <FormSection
        title="Dashboard zichtbaarheid"
        description="Bepaal welke onderdelen de klant kan zien."
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        }
      >
        <div className="space-y-3">
          <Toggle
            id="inboxVisible"
            name="inboxVisible"
            defaultChecked={defaultValues?.inboxVisible ?? false}
            label="E-mail inbox zichtbaar"
            description="Toont de Instantly inbox in het klantdashboard."
          />
          <Toggle
            id="chatInboxVisible"
            name="chatInboxVisible"
            defaultChecked={defaultValues?.chatInboxVisible ?? true}
            label="Chat inbox zichtbaar"
            description="Toont de chat-gebaseerde inbox in het klantdashboard."
          />
        </div>
      </FormSection>

      {/* Sticky submit */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white/95 p-3 pl-5 shadow-lg backdrop-blur">
        <p className="text-xs text-gray-500">
          {isEditing ? 'Wijzigingen worden direct doorgevoerd.' : 'De klant krijgt direct toegang na aanmaken.'}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-600/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {pending ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              {isEditing ? 'Bijwerken...' : 'Aanmaken...'}
            </>
          ) : (
            <>
              {isEditing ? 'Klant bijwerken' : 'Klant aanmaken'}
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  )
}

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
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

function Toggle({
  id,
  name,
  defaultChecked,
  label,
  description,
}: {
  id: string
  name: string
  defaultChecked: boolean
  label: string
  description: string
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4 transition-colors hover:bg-gray-50 has-[:checked]:border-indigo-200 has-[:checked]:bg-indigo-50/50">
      <div className="relative mt-0.5 flex-shrink-0">
        <input
          id={id}
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <div className="h-5 w-9 rounded-full bg-gray-300 transition-colors peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-violet-500" />
        <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="mt-0.5 text-xs text-gray-500">{description}</div>
      </div>
    </label>
  )
}
