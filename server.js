const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const port = Number(process.env.PORT || 3000)
const root = __dirname

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent((req.url || '/').split('?')[0])
  const requestedPath = pathname === '/' ? '/index.html' : pathname
  const filePath = path.join(root, requestedPath)

  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not found')
    return
  }

  const extension = path.extname(filePath)
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
  }

  res.writeHead(200, { 'Content-Type': contentTypes[extension] || 'application/octet-stream' })
  fs.createReadStream(filePath).pipe(res)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Iranium site listening on port ${port}`)
})
