import { Router } from 'express'
import { EmpresaController } from '../controllers/EmpresaController'
import { handleErrors } from '../middleware/validation'
import { body } from 'express-validator'
import { authenticateToken, authorizeRole } from '../middleware/auth'

const router = Router()

// Get all sedes - accessible to authenticated users (for frontend input tag)
router.get('/',
    authenticateToken,
    EmpresaController.getAllEmpresas
)

// Create new sede - only admin
router.post('/',
    authenticateToken,
    authorizeRole('admin'),
    body('nombre').isIn(['jesus maria', 'golf', 'sjm', 'hub', 'operaciones', 'talentos', 'marketing', 'finanzas', 'contabilidad', 'ti']).withMessage('Nombre de sede no válido'),
    handleErrors,
    EmpresaController.createEmpresa
)

export default router
