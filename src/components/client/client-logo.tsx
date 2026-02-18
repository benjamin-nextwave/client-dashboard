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
    <div className="relative h-10 w-[160px]">
      <Image
        src={logoUrl}
        alt={companyName + ' logo'}
        fill
        className="object-contain object-left"
        unoptimized={logoUrl.endsWith('.svg')}
      />
    </div>
  )
}
