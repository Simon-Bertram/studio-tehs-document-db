import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {defineCliConfig} from 'sanity/cli'
import type {Plugin} from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const docsBuildDir = path.resolve(rootDir, 'documentation/build')

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.map': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
}

/**
 * Serve the Docusaurus build at /documentation during `sanitydev`
 * (production places the same files in dist/documentation via docs:dist).
 */
function serveDocumentationPlugin(): Plugin {
  return {
    name: 'serve-documentation',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url?.split('?')[0]
        if (!rawUrl?.startsWith('/documentation')) {
          next()
          return
        }

        if (!fs.existsSync(docsBuildDir)) {
          res.statusCode = 503
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end('Documentation not built. Run: bun run docs:build\n')
          return
        }

        let relPath = decodeURIComponent(rawUrl.slice('/documentation'.length))
        if (!relPath || relPath === '/') {
          relPath = '/index.html'
        }

        let filePath = path.normalize(path.join(docsBuildDir, relPath))
        if (!filePath.startsWith(docsBuildDir)) {
          res.statusCode = 403
          res.end('Forbidden')
          return
        }

        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
          filePath = path.join(filePath, 'index.html')
        } else if (!path.extname(filePath) && !fs.existsSync(filePath)) {
          const withIndex = path.join(filePath, 'index.html')
          if (fs.existsSync(withIndex)) {
            filePath = withIndex
          }
        }

        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          res.statusCode = 404
          res.end('Not found')
          return
        }

        const ext = path.extname(filePath).toLowerCase()
        res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream')
        fs.createReadStream(filePath).pipe(res)
      })
    },
  }
}

export default defineCliConfig({
  api: {
    projectId: 'z8o776vu',
    dataset: 'production',
  },
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
    appId: 'z8o776vu',
  },
  vite: (config) => ({
    ...config,
    plugins: [...(config.plugins || []), serveDocumentationPlugin()],
    server: {
      ...config.server,
      watch: {
        ...config.server?.watch,
        ignored: [
          ...(Array.isArray(config.server?.watch?.ignored)
            ? config.server.watch.ignored
            : config.server?.watch?.ignored
              ? [config.server.watch.ignored]
              : []),
          '**/documentation/build/**',
          '**/documentation/node_modules/**',
          '**/documentation/.docusaurus/**',
        ],
      },
    },
  }),
})
