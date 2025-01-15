import { beforeAll, afterAll } from 'vitest'
import { buildApp } from '@app/app'
import { FastifyInstance } from 'fastify'

let fastify: FastifyInstance

beforeAll(async () => {
  // Initialize the fastify instance
  fastify = await buildApp()
  await fastify.ready()
})

afterAll(async () => {
  await fastify?.close()
})

export { fastify }
