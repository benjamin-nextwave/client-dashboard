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
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {isEditing && originalEmail && (
        <input type="hidden" name="originalEmail" value={originalEmail} />
      )}

      {/* Bedrijfsnaam */}
      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
          Bedrijfsnaam
        </label>
        <input
          id="companyName"
          type="text"
          {...register('companyName')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.companyName && (
          <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>
        )}
      </div>

      {/* E-mailadres */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          E-mailadres
        </label>
        <input
          id="email"
          type="email"
          {...register('email')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Wachtwoord */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Wachtwoord
        </label>
        {isEditing && (
          <p className="text-xs text-gray-500">Laat leeg om niet te wijzigen</p>
        )}
        <input
          id="password"
          type="password"
          {...register('password')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      {/* Primaire kleur */}
      <ColorPicker
        name="primaryColor"
        defaultValue={defaultValues?.primaryColor ?? '#3B82F6'}
      />

      {/* Logo */}
      <LogoUpload currentLogoUrl={currentLogoUrl} />

      {/* Instantly Inbox URL */}
      <div>
        <label htmlFor="inboxUrl" className="block text-sm font-medium text-gray-700">
          Instantly Inbox URL
        </label>
        <p className="text-xs text-gray-500">De URL van de Instantly inbox die wordt getoond in het klantdashboard</p>
        <input
          id="inboxUrl"
          type="url"
          {...register('inboxUrl')}
          placeholder="https://app.instantly.ai/..."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.inboxUrl && (
          <p className="mt-1 text-sm text-red-600">{errors.inboxUrl.message}</p>
        )}
      </div>

      {/* E-mail inbox zichtbaar */}
      <div className="flex items-center gap-2">
        <input
          id="inboxVisible"
          type="checkbox"
          {...register('inboxVisible')}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="inboxVisible" className="text-sm font-medium text-gray-700">
          E-mail inbox zichtbaar voor klant
        </label>
      </div>

      {/* Chat inbox zichtbaar */}
      <div className="flex items-center gap-2">
        <input
          id="chatInboxVisible"
          type="checkbox"
          {...register('chatInboxVisible')}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="chatInboxVisible" className="text-sm font-medium text-gray-700">
          Inbox zichtbaar voor klant
        </label>
      </div>

      {/* Recruitment klant */}
      <div className="flex items-center gap-2">
        <input
          id="isRecruitment"
          type="checkbox"
          {...register('isRecruitment')}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="isRecruitment" className="text-sm font-medium text-gray-700">
          Recruitment klant
        </label>
      </div>

      {/* Instantly API Key */}
      <div>
        <label htmlFor="instantlyApiKey" className="block text-sm font-medium text-gray-700">
          Instantly API Key
        </label>
        <p className="text-xs text-gray-500">De API key van de workspace van deze klant</p>
        <input
          id="instantlyApiKey"
          type="password"
          {...register('instantlyApiKey')}
          placeholder="••••••••"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending
            ? (isEditing ? 'Bijwerken...' : 'Aanmaken...')
            : (isEditing ? 'Klant bijwerken' : 'Klant aanmaken')}
        </button>
      </div>
    </form>
  )
}
