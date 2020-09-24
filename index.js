const micro = require('micro')
const {get, post, router} = require('microrouter')
const {enqueue, configureQueues, joinJobQueue, disconnectQueues} = require('bull-manager')

const sentry = require('./lib/utils/sentry')
const mongo = require('./lib/utils/mongo')
const createRedis = require('./lib/utils/redis')

const jobs = require('./jobs/definitions')

const {findLink, upsertLink, getLinkSummary} = require('./lib/link')
const {getLinkChecks, getLinkCheck, findLastNonRunningCheck} = require('./lib/check')

function handleErrors(next) {
  return async (req, res) => {
    try {
      return await next(req, res)
    } catch (error) {
      if (error.statusCode) {
        if (error.originalError) {
          sentry.captureException(error)
        }

        return micro.send(res, error.statusCode, {
          error: error.message
        })
      }

      sentry.captureException(error)
      return micro.send(res, 500, {
        error: 'an unexpected error happened, we have been notified'
      })
    }
  }
}

const routes = router(
  get('/', async (req, res) => {
    if (!req.query.location) {
      throw micro.createError(400, 'location is required')
    }

    const link = await findLink(req.query.location)

    if (!link) {
      throw micro.createError(404, `link with location ${req.query.location} was not found`)
    }

    res.statusCode = 302
    res.setHeader('Location', `/${link._id}`)
    res.end()
  }),

  get('/:link/checks/latest', async (req, res) => {
    const check = await findLastNonRunningCheck(req.params.link)

    if (!check) {
      throw micro.createError(404, `latest check for link ${req.params.link} was not found`)
    }

    res.statusCode = 302
    res.setHeader('Location', `/${req.params.link}/checks/${check.number}`)
    res.end()
  }),

  get('/:link/checks/:number', async req => {
    const check = await getLinkCheck(req.params.link, req.params.number)

    if (!check) {
      throw micro.createError(404, `check number ${req.params.number} for link ${req.params.link} was not found`)
    }

    return check
  }),

  get('/:link/checks', async req => {
    const checks = await getLinkChecks(req.params.link)

    if (!checks) {
      throw micro.createError(404, `link with id ${req.params.link} was not found`)
    }

    return checks
  }),

  get('/:link', async req => {
    const summary = await getLinkSummary(req.params.link)

    if (!summary) {
      throw micro.createError(404, `link with id ${req.params.link} was not found`)
    }

    return summary
  }),

  post('/', async req => {
    const json = await micro.json(req)

    if (!json.location) {
      throw micro.createError(400, 'location is required')
    }

    const link = await upsertLink(json.location)

    await enqueue('check', json.location, {
      location: json.location,
      linkId: link._id,
      options: {
        noCache: Boolean(json.noCache)
      }
    })

    return link
  })
)

const server = micro(handleErrors(routes))

async function main() {
  const port = process.env.LINKPROXY_PORT || 5000

  await mongo.connect()
  await mongo.ensureIndexes()
  await server.listen(port)

  configureQueues({
    createRedis: createRedis({
      onError: shutdown
    }),
    prefix: 'link-proxy'
  })

  await Promise.all(
    jobs.map(job => {
      return joinJobQueue(job.name, job.options)
    })
  )

  mongo.client.on('close', () => {
    shutdown(new Error('Mongo connection was closed'))
  })

  console.log(`Server running on port ${port}`)
}

main().catch(error => {
  shutdown(error)
})

async function shutdown(err) {
  await Promise.all([
    server.close(),
    disconnectQueues(),
    mongo.disconnect()
  ])

  if (err) {
    sentry.captureException(err)
    process.exit(1)
  }
}
