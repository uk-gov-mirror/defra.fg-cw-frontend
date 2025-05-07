import { casesController } from './controller.js'

export const cases = {
  plugin: {
    name: 'cases',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/cases',
          options: {
            auth: {
              strategy: 'msEntraId',
              mode: 'try'
            }
          },
          handler: casesController.handler
        },
        {
          method: 'GET',
          path: '/case/{id}',
          handler: casesController.show
        },
        {
          method: 'GET',
          path: '/case/{id}/tasks/{groupId}/{taskId}',
          handler: casesController.showTask
        },
        {
          method: 'GET',
          path: '/case/{id}/caseDetails',
          handler: casesController.show
        },
        {
          method: 'POST',
          path: '/case/{id}',
          handler: casesController.updateStage
        }
      ])
    }
  }
}
