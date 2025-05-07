import { caseController } from '../controller/case.controller.js'

export const listCasesRoutes = {
  method: 'GET',
  path: '/cases',
  options: {
    auth: {
      mode: 'try',
      strategy: 'msEntraId'
    }
  },
  handler: caseController.listCases
}
