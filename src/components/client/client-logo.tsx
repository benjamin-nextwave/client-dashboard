import Image from 'next/image'

interface ClientLogoProps {
  logoUrl: string | null
  companyName: string
}

export function ClientLogo({ logoUrl, companyName }: ClientLogoProps) {
  // Zonder logo: initiaal in een vierkant, met daarnaast de bedrijfsnaam.
  if (!logoUrl) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white text-base font-bold text-ink">
          {companyName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 truncate text-[13.5px] font-semibold tracking-[-0.01em] text-white">
          {companyName}
        </div>
      </div>
    )
  }

  // Mét logo: op volle breedte tonen in plaats van in een vierkant te persen.
  // Klantlogo's zijn vaak woordmerken die onleesbaar worden op 36 bij 36.
  return (
    <div className="relative h-9 w-[150px]">
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
