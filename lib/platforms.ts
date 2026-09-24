export const PLATFORMS = [
  { id: 'medium', name: 'Medium', color: '#000000', icon: 'BookOpen' },
  { id: 'linkedin', name: 'LinkedIn', color: '#0A66C2', icon: 'Linkedin' },
  { id: 'instagram', name: 'Instagram', color: '#E4405F', icon: 'Instagram' },
  { id: 'devto', name: 'Dev.to', color: '#0A0A0A', icon: 'Code2' },
  { id: 'wordpress', name: 'WordPress', color: '#21759B', icon: 'Globe' },
] as const

export type PlatformId = (typeof PLATFORMS)[number]['id']

export const PLATFORM_CREDENTIALS: Record<string, { fields: { key: string; label: string; hint: string; type?: string }[] }> = {
  medium: {
    fields: [
      { key: 'token', label: 'Integration Token', hint: 'Go to Medium → Settings → Integration tokens → Generate one' },
    ],
  },
  linkedin: {
    fields: [
      { key: 'accessToken', label: 'Access Token', hint: 'Create a LinkedIn app at linkedin.com/developers, then use OAuth to get an access token' },
      { key: 'personUrn', label: 'Person URN', hint: 'Format: urn:li:person:XXXXX — find via LinkedIn API /me endpoint' },
    ],
  },
  instagram: {
    fields: [
      { key: 'pageAccessToken', label: 'Facebook Page Access Token', hint: 'Create via Facebook Graph API Explorer with pages_manage_posts permission' },
      { key: 'igUserId', label: 'Instagram Business Account ID', hint: 'Find via Facebook Page → Settings → Instagram → Connected account ID' },
    ],
  },
  devto: {
    fields: [
      { key: 'apiKey', label: 'API Key', hint: 'Go to dev.to → Settings → Extensions → DEV Community API Keys → Generate' },
    ],
  },
  wordpress: {
    fields: [
      { key: 'siteUrl', label: 'Site URL', hint: 'Your WordPress site URL, e.g. https://yoursite.com' },
      { key: 'username', label: 'Username', hint: 'Your WordPress admin username' },
      { key: 'appPassword', label: 'Application Password', hint: 'Go to Users → Profile → Application Passwords → Add New', type: 'password' },
    ],
  },
}
