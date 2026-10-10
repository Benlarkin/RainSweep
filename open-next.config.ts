import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache'

// Every mail route is dynamic and per-user, so there is no ISR to revalidate.
// Prerendered pages are served from the Worker's static assets, which keeps
// the deployment to a single Worker with no R2 bucket or KV namespace.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
})
