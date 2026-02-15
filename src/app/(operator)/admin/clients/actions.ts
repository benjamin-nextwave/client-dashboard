'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { clientFormSchema } from '@/lib/validations/client'
import { uploadClientLogo } from '@/lib/supabase/storage'

export async function createClient(
  prevState: { error: string },
  formData: FormData
) {
  const raw = {
    companyName: formData.get('companyName') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    primaryColor: formData.get('primaryColor') as string,
    isRecruitment: formData.get('isRecruitment') === 'on',
    meetingUrl: formData.get('meetingUrl') as string,
  }

  const result = clientFormSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  const { companyName, email, password, primaryColor, isRecruitment, meetingUrl } = result.data

  const supabase = createAdminClient()

  // Step 1: Insert client record
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      company_name: companyName,
      primary_color: primaryColor,
      is_recruitment: isRecruitment,
      meeting_url: meetingUrl || null,
    })
    .select('id')
    .single()

  if (clientError || !client) {
    return { error: `Klant aanmaken mislukt: ${clientError?.message ?? 'onbekende fout'}` }
  }

  // Step 2: Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      user_role: 'client',
      client_id: client.id,
    },
  })

  if (authError || !authData.user) {
    // Rollback: delete client record
    await supabase.from('clients').delete().eq('id', client.id)
    return { error: `Gebruiker aanmaken mislukt: ${authError?.message ?? 'onbekende fout'}` }
  }

  // Step 3: Insert profile record
  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    user_role: 'client',
    client_id: client.id,
    display_name: companyName,
  })

  if (profileError) {
    // Rollback: delete auth user and client record
    await supabase.auth.admin.deleteUser(authData.user.id)
    await supabase.from('clients').delete().eq('id', client.id)
    return { error: `Profiel aanmaken mislukt: ${profileError.message}` }
  }

  // Step 4: Handle logo upload (non-fatal)
  const logo = formData.get('logo') as File | null
  if (logo && logo.size > 0) {
    const uploadResult = await uploadClientLogo(client.id, logo)
    if ('error' in uploadResult) {
      console.warn(`Logo upload mislukt voor klant ${client.id}: ${uploadResult.error}`)
      await supabase.from('clients').update({ logo_url: null }).eq('id', client.id)
    } else {
      await supabase.from('clients').update({ logo_url: uploadResult.url }).eq('id', client.id)
    }
  }

  // Step 5: Handle campaign associations (non-fatal)
  const campaignIds = formData.getAll('campaign_ids') as string[]
  const campaignNames = formData.getAll('campaign_names') as string[]
  if (campaignIds.length > 0) {
    const campaignRows = campaignIds.map((id, index) => ({
      client_id: client.id,
      campaign_id: id,
      campaign_name: campaignNames[index] || '',
    }))

    const { error: campaignError } = await supabase
      .from('client_campaigns')
      .insert(campaignRows)

    if (campaignError) {
      console.warn(`Campagne koppeling mislukt voor klant ${client.id}: ${campaignError.message}`)
    }
  }

  revalidatePath('/admin')
  redirect('/admin')
}
