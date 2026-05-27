import {Router} from 'express'
import {body, param} from 'express-validator'
import { ProjectController } from '../controllers/ProjectController'
import { handleErrors } from '../middleware/validation'
import { TaskController } from '../controllers/TaskController'
import { validateProjectExists } from '../middleware/project'
import { hasAuthorization, taskBelongToProject, tasktExists } from '../middleware/task'
import { projectStatus, taskPriority } from '../constants'
import { authenticateToken } from '../middleware/auth'
import { belongsToEmpresa } from '../middleware/empresa'
import { TeamMemberController } from '../controllers/TeamMenmberController'
import { NoteController } from '../controllers/NoteController'

//ojo-> una tarea tiene un proyecto y un proyecto tiene muchas tareas!!!
const router = Router()
//como cada ruta necesita estar autenticada, usaremos el middleware globalmentede autenticación

/*Cuando agregas router.use('/api', authenticateToken), todos los endpoints que comiencen con /api estarán protegidos por el middleware authenticateToken. Sin embargo, en el código que compartiste, ninguno de tus endpoints parece comenzar con /api. Por lo tanto, este middleware global no afecta tus rutas actuales.*/
router.use('/dashboard',authenticateToken) //<-protege todos los endpoint que usen router

router.post('/dashboard/projects',
    body('projectName').not().isEmpty().withMessage('El nombre del proyecto es obligatorio'),
    body('clientName').not().isEmpty().withMessage('El nombre del cliente es obligatorio'),
    body('description').not().isEmpty().withMessage('La descripcion es obligatoria'),
    body('empresa').not().isEmpty().withMessage('La empresa es obligatoria'),
    body('startDate').optional().isISO8601().withMessage('Formato de fecha de inicio inválido'),
    body('dueDate').optional().isISO8601().withMessage('Formato de fecha límite inválido'),
    handleErrors,
    ProjectController.createProject
)

router.get('/dashboard/projects', 
    ProjectController.getAllProject
)

router.get('/dashboard/projects/:id',
    param('id').isMongoId().withMessage('El id es obligatorio'),
    handleErrors,
    ProjectController.getProjectById
)

router.get('/dashboard/projects/:id/tasks-preview',
    param('id').isMongoId().withMessage('El id es obligatorio'),
    handleErrors,
    ProjectController.getProjectTasksPreview
)

router.param('projectId', validateProjectExists)

router.put('/dashboard/projects/:projectId',
    param('projectId').isMongoId().withMessage('El id es obligatorio'),
    body('projectName').not().isEmpty().withMessage('El nombre del proyecto es obligatorio'),
    body('clientName').not().isEmpty().withMessage('El nombre del cliente es obligatorio'),
    body('description').not().isEmpty().withMessage('La descripcion es obligatoria'),
    body('startDate').optional().isISO8601().withMessage('Formato de fecha de inicio inválido'),
    body('dueDate').optional().isISO8601().withMessage('Formato de fecha límite inválido'),
    handleErrors,
    belongsToEmpresa,
    hasAuthorization,
    ProjectController.updateProject
)

router.delete('/dashboard/projects/:projectId',
    param('projectId').isMongoId().withMessage('El id es obligatorio'),
    handleErrors,
    belongsToEmpresa,
    hasAuthorization,
    ProjectController.deleteProject
)

router.patch('/dashboard/projects/:id/dates',
    param('id').isMongoId().withMessage('ID de proyecto inválido'),
    body('startDate').optional({ checkFalsy: true }).isISO8601().withMessage('Formato de fecha de inicio inválido'),
    body('dueDate').optional({ checkFalsy: true }).isISO8601().withMessage('Formato de fecha límite inválido'),
    handleErrors,
    ProjectController.updateProjectDates
)

router.patch('/dashboard/projects/:id/status',
    param('id').isMongoId().withMessage('ID de proyecto inválido'),
    body('status').isIn(Object.values(projectStatus)).withMessage('Estado inválido'),
    handleErrors,
    ProjectController.updateProjectStatus
)

router.patch('/dashboard/projects/:id/priority',
    param('id').isMongoId().withMessage('ID de proyecto inválido'),
    body('priority').optional().isIn([...Object.values(taskPriority), null]).withMessage('Prioridad inválida'),
    handleErrors,
    ProjectController.updateProjectPriority
)

router.patch('/dashboard/projects/:projectId/responsible',
    belongsToEmpresa,
    hasAuthorization,
    body('userIds').isArray().withMessage('Se requiere un array de identificadores de usuario'),
    handleErrors,
    ProjectController.updateProjectResponsible
)

router.get('/dashboard/projects/:projectId/sede-users',
    belongsToEmpresa,
    ProjectController.getUsersByProjectSede
)

/* Routes for task */
router.param('taskId', tasktExists)
router.param('taskId', taskBelongToProject)

// Batch reorder (must be before :taskId routes to avoid param conflict)
router.put('/dashboard/:projectId/tasks-order',
    belongsToEmpresa,
    body('tasks').isArray().withMessage('Se requiere un array de tareas con orden'),
    handleErrors,
    TaskController.reorderTasks
)

router.post('/dashboard/:projectId/tasks',
    belongsToEmpresa,
    body('name').not().isEmpty().withMessage('El nombre de la tarea es obligatorio'),
    body('description').optional(),
    body('startDate').optional().isISO8601().withMessage('Formato de fecha de inicio inválido'),
    body('dueDate').optional().isISO8601().withMessage('Formato de fecha límite inválido'),
    body('priority').optional().isIn(Object.values(taskPriority)).withMessage('Prioridad inválida'),
    handleErrors,
    TaskController.createTask
)

router.get('/dashboard/:projectId/tasks', 
    belongsToEmpresa,
    param('projectId').isMongoId().withMessage('El id es obligatorio'),
    handleErrors,
    TaskController.getProjectTask
)

router.get('/dashboard/:projectId/tasks/:taskId', 
    belongsToEmpresa,
    param('taskId').isMongoId().withMessage('El id de la tarea es obligatorio'),
    handleErrors,
    TaskController.getTaskById,
)

router.put('/dashboard/:projectId/tasks/:taskId', 
    belongsToEmpresa,
    param('taskId').isMongoId().withMessage('El id de la tarea es obligatorio'),
    body('name').not().isEmpty().withMessage('El nombre de la tarea es obligatorio'),
    body('description').optional(),
    body('startDate').optional().isISO8601().withMessage('Formato de fecha de inicio inválido'),
    body('dueDate').optional().isISO8601().withMessage('Formato de fecha límite inválido'),
    body('priority').optional().isIn(Object.values(taskPriority)).withMessage('Prioridad inválida'),
    handleErrors,
    TaskController.updateTask
)

router.delete('/dashboard/:projectId/tasks/:taskId', 
    belongsToEmpresa,
    param('taskId').isMongoId().withMessage('El id de la tarea es obligatorio'),
    handleErrors,
    TaskController.deleteTask
)

router.patch('/dashboard/:projectId/tasks/:taskId/dates',
    belongsToEmpresa,
    param('taskId').isMongoId().withMessage('El id de la tarea es obligatorio'),
    body('startDate').optional({ checkFalsy: true }).isISO8601().withMessage('Formato de fecha de inicio inválido'),
    body('dueDate').optional({ checkFalsy: true }).isISO8601().withMessage('Formato de fecha límite inválido'),
    handleErrors,
    TaskController.updateTaskDates
)

router.patch('/dashboard/:projectId/tasks/:taskId/priority',
    belongsToEmpresa,
    param('taskId').isMongoId().withMessage('El id de la tarea es obligatorio'),
    body('priority').optional().isIn([...Object.values(taskPriority), null]).withMessage('Prioridad inválida'),
    handleErrors,
    TaskController.updateTaskPriority
)

router.patch('/dashboard/:projectId/tasks/:taskId/assign',
    belongsToEmpresa,
    body('userIds').isArray().withMessage('Se requiere un array de identificadores de usuario'),
    handleErrors,
    TaskController.assignTask
)

//endpoint para cambiar el estado de una tarea
router.post('/dashboard/:projectId/tasks/:taskId/status',
    belongsToEmpresa,
    param('taskId').isMongoId().withMessage('El id de la tarea es obligatorio'),
    body('status').notEmpty().withMessage('El status es obligatorio'),
    handleErrors,
    TaskController.changeStatusTask
)

/* Routes for subtasks */
router.get('/dashboard/:projectId/tasks/:taskId/subtasks',
    belongsToEmpresa,
    param('taskId').isMongoId().withMessage('El id de la tarea es obligatorio'),
    handleErrors,
    TaskController.getSubtasks
)

router.get('/dashboard/:projectId/tasks/:taskId/tree',
    belongsToEmpresa,
    param('taskId').isMongoId().withMessage('El id de la tarea es obligatorio'),
    handleErrors,
    TaskController.getTaskTree
)

router.put('/dashboard/:projectId/tasks/:taskId/move',
    belongsToEmpresa,
    param('taskId').isMongoId().withMessage('El id de la tarea padre es obligatorio'),
    body('newParentTask').isMongoId().withMessage('El id de la tarea padre es obligatorio'),
    handleErrors,
    TaskController.moveTask
)

/* Routes for teams */
//preguntamos al usuario cual es su email para agregarle al proyecto
router.post('/dashboard/:projectId/team/search',
    belongsToEmpresa,
    body('email').isEmail().withMessage('El email es obligatorio'),
    handleErrors,
    TeamMemberController.findMemberByEmail
)

router.post('/dashboard/:projectId/team',
    belongsToEmpresa,
    body('id').isMongoId().withMessage('ID no válido'),
    handleErrors,
    TeamMemberController.addTeamMember
)

router.get('/dashboard/:projectId/team',
    belongsToEmpresa,
    TeamMemberController.getAllTeamMember
)

router.get('/dashboard/:projectId/members',
    belongsToEmpresa,
    TeamMemberController.getProjectMembers
)

router.delete('/dashboard/:projectId/team/:userId',
    belongsToEmpresa,
    param('userId').isMongoId().withMessage('ID no válido'),
    handleErrors,
    TeamMemberController.removeMemberById
)

/*----- Rutas para las notas -----*/
router.post('/dashboard/projects/:projectId/tasks/:taskId/notes',
    belongsToEmpresa,
    body('content').notEmpty().withMessage('El contenido de la nota es obligatorio'),
    handleErrors,
    NoteController.createNote
)

router.get('/dashboard/projects/:projectId/tasks/:taskId/notes',
    belongsToEmpresa,
    NoteController.getTaskNotes
)

router.delete('/dashboard/projects/:projectId/tasks/:taskId/notes/:noteId',
    belongsToEmpresa,
    param('noteId').isMongoId().withMessage('El id de la nota es obligatorio'),
    handleErrors,
    NoteController.deleteNote
)


export default router;