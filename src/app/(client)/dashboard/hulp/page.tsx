import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { VoiceglowInline } from '@/components/client/voiceglow-chat'
import { getTranslator } from '@/lib/i18n/server'
import { HelpVideos } from './_components/help-videos'

export const metadata: Metadata = { title: 'Hulp & uitleg' }
export const dynamic = 'force-dynamic'

const VIDEO_IDS = {
  general: 'b38fb5e422e947df8e3e3632c7093ffd',
  reply: '41fbd7812a784bcea74b8e791ddb7279',
  inbox: '87e25d43233745d8bd3771c71706389f',
} as const

export default async function HulpPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  const t = await getTranslator()

  const videos = [
    { title: t('settings.videoGeneral'), id: VIDEO_IDS.general },
    { title: t('settings.videoReply'), id: VIDEO_IDS.reply },
    { title: t('settings.videoInbox'), id: VIDEO_IDS.inbox },
  ]

  /* Geen kop of inleiding: de assistent staat er direct. De hoogte is die van
     het venster min de padding van de layout (py-10), zodat de pagina zelf niet
     scrollt en alleen de videokolom rechts meegeeft. Onder lg valt dat terug op
     een gewone, wél scrollende kolomstapeling. */
  return (
    <div className="flex flex-col gap-5 lg:h-[calc(100vh-5rem)] lg:flex-row">
      <div className="h-[520px] shrink-0 lg:h-full lg:w-[420px]">
        <VoiceglowInline />
      </div>

      <HelpVideos videos={videos} />
    </div>
  )
}
