import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { VoiceglowInline } from '@/components/client/voiceglow-chat'
import { getTranslator } from '@/lib/i18n/server'

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

  return (
    <div>
      <h1 className="text-[25px] font-semibold tracking-[-0.03em]">{t('helpPage.title')}</h1>
      <p className="mt-[7px] max-w-[640px] text-[15px] leading-[1.5] text-muted">
        {t('helpPage.intro')}
      </p>

      {/* Chatbot bovenaan — de assistent kan doorverbinden met een medewerker. */}
      <section className="mt-6">
        <h2 className="text-[13.5px] font-semibold tracking-[-0.01em]">
          {t('helpPage.chatTitle')}
        </h2>
        <p className="mt-1 max-w-[640px] text-[12.5px] leading-[1.6] text-muted">
          {t('helpPage.chatIntro')}
        </p>
        <div className="mt-3">
          <VoiceglowInline />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[13.5px] font-semibold tracking-[-0.01em]">
          {t('helpPage.videosTitle')}
        </h2>

        <div className="mt-3 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {videos.map((video) => (
            <div
              key={video.id}
              className="overflow-hidden rounded-panel border border-line bg-panel"
            >
              <div className="px-5 py-3">
                <h3 className="text-[12.5px] font-semibold">{video.title}</h3>
              </div>
              <div className="relative aspect-video">
                <iframe
                  src={`https://www.loom.com/embed/${video.id}`}
                  title={video.title}
                  className="absolute inset-0 h-full w-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
