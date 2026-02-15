import Image from 'next/image'

interface ClientLogoProps {
  logoUrl: string | null
  companyName: string
}

export function ClientLogo({ logoUrl, companyName }: ClientLogoProps) {
  if (!logoUrl) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white font-bold text-lg">
        {companyName.charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <Image
      src={logoUrl}
      alt={companyName + ' logo'}
      width={160}
      height={40}
      className="h-10 w-auto object-contain"
      unoptimized={logoUrl.endsWith('.svg')}
    />
  )
}
