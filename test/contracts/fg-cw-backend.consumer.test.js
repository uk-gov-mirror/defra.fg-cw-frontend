import { Pact } from '@pact-foundation/pact'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import fetch from 'node-fetch'
import net from 'net'

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = resolve(__filename, '..')

// Make fetch available globally
globalThis.fetch = fetch

// Helper function to find an available port
async function findAvailablePort(startPort = 9000, endPort = 9999) {
  for (let port = startPort; port <= endPort; port++) {
    try {
      await new Promise((resolve, reject) => {
        const server = net.createServer()
        server.listen(port, () => {
          server.close(resolve)
        })
        server.on('error', reject)
      })
      return port
    } catch (err) {
      continue
    }
  }
  throw new Error('No available port found')
}

describe('fg-cw-frontend → fg-cw-backend Contract', () => {
  let provider
  let mockServerPort

  beforeAll(async () => {
    // Find an actually available port
    mockServerPort = await findAvailablePort(9000, 9999)
    console.log(`Using port ${mockServerPort} for mock server`)
    
    provider = new Pact({
      consumer: 'fg-cw-frontend',
      provider: 'fg-cw-backend',
      port: mockServerPort,
      log: resolve(__dirname, '../logs', 'pact.log'),
      dir: resolve(__dirname, '../pacts'),
      logLevel: 'INFO'
    })

    await provider.setup()
  })

  afterEach(async () => {
    // Small delay between tests to ensure mock server is ready
    await new Promise(resolve => setTimeout(resolve, 100))
  })

  afterAll(async () => {
    try {
      await provider.finalize()
    } catch (err) {
      console.log('Provider finalize error (non-critical):', err.message)
    }
    // Longer delay to ensure complete cleanup
    await new Promise(resolve => setTimeout(resolve, 500))
  })

  describe('Cases API', () => {
    it('should retrieve list of cases', async () => {
      const expectedResponse = [
        {
          _id: '64abc123456789012345678ab',
          workflowCode: 'frps-private-beta',
          caseRef: 'APPLICATION-REF-1',
          status: 'IN PROGRESS',
          dateReceived: '2025-03-27T11:34:52.000Z',
          currentStage: 'application-receipt',
          stages: [
            {
              id: 'application-receipt',
              taskGroups: [
                {
                  id: 'application-receipt-tasks',
                  tasks: [
                    {
                      id: 'simple-review',
                      status: 'pending'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]

      await provider.addInteraction({
        state: 'cases exist in the system',
        uponReceiving: 'a request to list cases',
        withRequest: {
          method: 'GET',
          path: '/cases',
          headers: {}
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: expectedResponse
        }
      })

      const response = await fetch(`http://localhost:${mockServerPort}/cases`, {
        method: 'GET'
      })

      const result = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0]._id).toBeDefined()
      expect(result[0].workflowCode).toBe('frps-private-beta')

      await provider.verify()
    })

    it('should retrieve detailed case information', async () => {
      const caseId = '64abc123456789012345678ab'

      const expectedResponse = {
        _id: '64abc123456789012345678ab',
        workflowCode: 'frps-private-beta',
        caseRef: 'APPLICATION-REF-1',
        status: 'IN PROGRESS',
        dateReceived: '2025-03-27T11:34:52.000Z',
        currentStage: 'application-receipt',
        payload: {
          metadata: {
            clientRef: 'TEST-REF-123456',
            sbi: '123456789',
            frn: '987654321',
            submittedAt: '2024-01-15T14:30:00Z'
          },
          answers: {
            scheme: 'SFI',
            year: 2024,
            agreementName: 'Test Agreement'
          }
        },
        stages: [
          {
            id: 'application-receipt',
            taskGroups: [
              {
                id: 'application-receipt-tasks',
                tasks: [
                  {
                    id: 'simple-review',
                    status: 'pending'
                  }
                ]
              }
            ]
          }
        ]
      }

      await provider.addInteraction({
        state: 'case 64abc123456789012345678ab exists',
        uponReceiving: 'a request for detailed case information',
        withRequest: {
          method: 'GET',
          path: `/cases/${caseId}`,
          headers: {}
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: expectedResponse
        }
      })

      const response = await fetch(`http://localhost:${mockServerPort}/cases/${caseId}`, {
        method: 'GET'
      })

      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result._id).toBe(caseId)
      expect(result.caseRef).toBe('APPLICATION-REF-1')
      expect(result.stages).toHaveLength(1)
      expect(result.payload).toBeDefined()

      await provider.verify()
    })

    it('should return 404 for non-existent case', async () => {
      const caseId = '64abc123456789012345678ff'

      const expectedResponse = {
        statusCode: 404,
        error: 'Not Found',
        message: 'Case not found'
      }

      await provider.addInteraction({
        state: 'case 64abc123456789012345678ff does not exist',
        uponReceiving: 'a request for non-existent case',
        withRequest: {
          method: 'GET',
          path: `/cases/${caseId}`,
          headers: {}
        },
        willRespondWith: {
          status: 404,
          headers: {
            'Content-Type': 'application/json'
          },
          body: expectedResponse
        }
      })

      const response = await fetch(`http://localhost:${mockServerPort}/cases/${caseId}`, {
        method: 'GET'
      })

      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('Not Found')

      await provider.verify()
    })
  })

  describe('Case Stage Management API', () => {
    it('should move case to next stage', async () => {
      const caseId = '64abc123456789012345678ab'
      const stageRequest = {
        action: 'approve'
      }

      const expectedResponse = {
        _id: '64abc123456789012345678ab',
        currentStage: 'application-review',
        status: 'IN PROGRESS',
        updatedAt: '2025-03-27T12:00:00.000Z'
      }

      await provider.addInteraction({
        state: 'case is at application-receipt stage',
        uponReceiving: 'a request to move case to next stage',
        withRequest: {
          method: 'POST',
          path: `/cases/${caseId}/stage`,
          headers: {
            'Content-Type': 'application/json'
          },
          body: stageRequest
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: expectedResponse
        }
      })

      const response = await fetch(`http://localhost:${mockServerPort}/cases/${caseId}/stage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(stageRequest)
      })

      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result._id).toBe(caseId)
      expect(result.currentStage).toBe('application-review')

      await provider.verify()
    })
  })

  describe('Workflows API', () => {
    it('should retrieve specific workflow by code', async () => {
      const workflowCode = 'frps-private-beta'

      const expectedResponse = {
        _id: '64def456789012345678abcd',
        code: 'frps-private-beta',
        payloadDefinition: {
          type: 'object',
          properties: {
            metadata: {
              type: 'object',
              properties: {
                clientRef: { type: 'string' },
                sbi: { type: 'string' }
              }
            },
            answers: {
              type: 'object',
              properties: {
                scheme: { type: 'string' },
                year: { type: 'number' }
              }
            }
          }
        },
        stages: [
          {
            id: 'application-receipt',
            title: 'Application Receipt',
            taskGroups: [
              {
                id: 'application-receipt-tasks',
                title: 'Application Receipt tasks',
                tasks: [
                  {
                    id: 'simple-review',
                    title: 'Simple Review',
                    type: 'boolean'
                  }
                ]
              }
            ],
            actions: [
              {
                id: 'approve',
                label: 'Approve'
              }
            ]
          }
        ]
      }

      await provider.addInteraction({
        state: 'workflow frps-private-beta exists',
        uponReceiving: 'a request for specific workflow',
        withRequest: {
          method: 'GET',
          path: `/workflows/${workflowCode}`,
          headers: {}
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: expectedResponse
        }
      })

      const response = await fetch(`http://localhost:${mockServerPort}/workflows/${workflowCode}`, {
        method: 'GET'
      })

      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.code).toBe(workflowCode)
      expect(result.stages).toHaveLength(1)
      expect(result.payloadDefinition).toBeDefined()

      await provider.verify()
    })

    it('should retrieve all workflows', async () => {
      const expectedResponse = [
        {
          _id: '64def456789012345678abcd',
          code: 'frps-private-beta',
          stages: [
            {
              id: 'application-receipt',
              title: 'Application Receipt',
              taskGroups: [
                {
                  id: 'application-receipt-tasks',
                  title: 'Application Receipt tasks',
                  tasks: [
                    {
                      id: 'simple-review',
                      title: 'Simple Review',
                      type: 'boolean'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]

      await provider.addInteraction({
        state: 'workflows are available',
        uponReceiving: 'a request for all workflows',
        withRequest: {
          method: 'GET',
          path: '/workflows',
          headers: {}
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: expectedResponse
        }
      })

      const response = await fetch(`http://localhost:${mockServerPort}/workflows`, {
        method: 'GET'
      })

      const result = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].code).toBe('frps-private-beta')

      await provider.verify()
    })
  })
})