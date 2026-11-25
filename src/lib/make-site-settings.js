import rawSiteSettings from '../../.figma/make/site.json'

export const makeSiteSettings = rawSiteSettings

export function sanitizeHtmlAttribute(value) {
  return value?.replace(/[^a-zA-Z0-9_-]/g, '') || ''
}
