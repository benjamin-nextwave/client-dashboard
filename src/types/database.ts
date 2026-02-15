export interface ClientCampaign {
  id: string
  client_id: string
  campaign_id: string
  campaign_name: string
  created_at: string
}

export interface Client {
  id: string
  company_name: string
  primary_color: string
  logo_url: string | null
  meeting_url: string | null
  is_recruitment: boolean
  created_at: string
  updated_at: string
}

export type ClientWithCampaigns = Client & {
  campaigns: ClientCampaign[]
}
