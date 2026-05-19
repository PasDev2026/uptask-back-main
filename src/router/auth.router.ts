import {Router} from 'express'
import { UserController } from '../controllers/UserController'
import { handleErrors } from '../middleware/validation'
import { body, param } from 'express-validator'
import { authenticateToken, authorizeRole } from '../middleware/auth'
import { roleTypes } from '../model/role'

const router = Router()

// Admin crea nuevo usuario
router.post('/users',
    authenticateToken,
    authorizeRole('admin'),
    body('name').not().isEmpty().withMessage('El nombre es obligatorio'),
    body('apellido_paterno').not().isEmpty().withMessage('El apellido paterno es obligatorio'),
    body('apellido_materno').not().isEmpty().withMessage('El apellido materno es obligatorio'),
    body('telefono').not().isEmpty().withMessage('El teléfono es obligatorio'),
    body('username').notEmpty().withMessage('El username es obligatorio'),
    body('dni').notEmpty().withMessage('El DNI es obligatorio'),
    body('password').isLength({min:8}).not().isEmpty().withMessage('El password es obligatorio'),
    body('email').optional().isEmail().withMessage('El email no es válido'),
    body('role').optional().isMongoId().withMessage('ID de rol no válido'),
    handleErrors,
    UserController.createUserByAdmin
)

//login
router.post('/login',
    body('username').notEmpty().withMessage('El username es obligatorio'),
    body('password').notEmpty().withMessage('El password es obligatorio'),
    handleErrors,
    UserController.login
)

router.get('/user',
    authenticateToken,
    UserController.user
)

router.get('/perfil/user',
    authenticateToken,
    UserController.user
)

router.get('/users',
    authenticateToken,
    authorizeRole('admin'),
    UserController.getAllUsers
)

// Get user by ID (admin)
router.get('/users/:userId',
    authenticateToken,
    authorizeRole('admin'),
    param('userId').isMongoId().withMessage('ID de usuario no válido'),
    handleErrors,
    UserController.getUserById
)

router.patch('/users/:userId/update-profile',
    authenticateToken,
    authorizeRole('admin'),
    body('email').optional().isEmail().withMessage('El email no es válido'),
    body('role').optional().isMongoId().withMessage('ID de rol no válido'),
    body('name').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
    body('apellido_paterno').optional().notEmpty().withMessage('El apellido paterno no puede estar vacío'),
    body('apellido_materno').optional().notEmpty().withMessage('El apellido materno no puede estar vacío'),
    body('telefono').optional().notEmpty().withMessage('El teléfono no puede estar vacío'),
    body('username').optional().notEmpty().withMessage('El username no puede estar vacío'),
    body('dni').optional().custom((value) => {
        if (value !== undefined && value.trim() === "") {
            throw new Error('El DNI no puede estar vacío');
        }
        return true;
    }),
    handleErrors,
    UserController.updateUserProfile
)

router.patch('/users/:userId',
    authenticateToken,
    authorizeRole('admin'),
    body('estado').isBoolean({ loose: true }).withMessage('El campo estado debe ser booleano'),
    handleErrors,
    UserController.updateUserStatus
)

/* Perfil */
router.put('/profile',
    authenticateToken,
    body('name').not().isEmpty().withMessage('El nombre es obligatorio'),
    body('email').optional().isEmail().withMessage('El email es obligatorio'),
    UserController.updateProfile
)

router.post('/profile/update-password',
    authenticateToken,
    body('current_password').not().isEmpty().withMessage('La contraseña actual es obligatoria'),
    body('password').isLength({min:8}).not().isEmpty().withMessage('El password es obligatorio'),
    body('password_confirmation').custom((value, {req}) => {
        if (value !== req.body.password) throw new Error('Las contraseñas no coinciden')
        return true
    }),
    handleErrors,
    UserController.updatePasswordProfile
)

router.post('/check-password',
    authenticateToken,
    body('password').not().isEmpty().withMessage('La contraseña actual es obligatoria'),
    handleErrors,
    UserController.checkPasswordProfile
)

router.get('/roles',
    authenticateToken,
    authorizeRole('admin'),
    UserController.getRoles
)


export default router