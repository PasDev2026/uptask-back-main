import type { Request, Response } from "express";
import User from "../model/User";
import Role from "../model/role";
import Area from "../model/area";
import { checkPassword, hashPassword } from "../utils/bcrypt";
import { generateJWT } from "../utils/jwt";
import mongoose from 'mongoose';
import { getIO } from '../services/socket.service';

export class UserController {
  static createUserByAdmin = async (req: Request, res: Response) => {
    try {
      const { password, email, username, dni, role: roleName, area: areaName } = req.body;

      // Verificar username único
      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        const error = new Error("El username ya esta en uso");
        res.status(400).json({ error: error.message });
        return;
      }

      // Verificar DNI único
      const dniExists = await User.findOne({ dni });
      if (dniExists) {
        const error = new Error("El DNI ya está en uso");
        res.status(400).json({ error: error.message });
        return;
      }

      // Verificar email único si se proporciona
      if (email) {
        const emailExists = await User.findOne({ email });
        if (emailExists) {
          const error = new Error("El email ya está en uso");
          res.status(400).json({ error: error.message });
          return;
        }
      }

      const user = new User(req.body);
      user.password = await hashPassword(password);
      user.confirmed = true;

      if (roleName) {
        const roleDoc = await Role.findById(roleName);
        if (!roleDoc) {
          const error = new Error(`Rol con ID '${roleName}' no existe`);
          res.status(400).json({ error: error.message });
          return;
        }
        user.role = roleDoc._id as mongoose.Types.ObjectId;
      }

      if (areaName) {
        const areaDoc = await Area.findById(areaName);
        if (!areaDoc) {
          const error = new Error(`Área con ID '${areaName}' no existe`);
          res.status(400).json({ error: error.message });
          return;
        }
        user.area = areaDoc._id as mongoose.Types.ObjectId;
      }

      await user.save();

      res.status(201).json({ message: 'Usuario creado correctamente' });
    } catch (error) {
      res.status(500).json({ error: 'Error del servidor' });
    }
  };

  static login = async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const user = await User.findOne({ username });
      if (!user) {
        const error = new Error("El usuario no existe");
        res.status(401).json({ error: error.message, field: "username" });
        return;
      }

      // Revisar password
      const isPasswordCorrect = await checkPassword(password, user.password);
      if (!isPasswordCorrect) {
        const error = new Error("Password Incorrecto");
        res.status(401).json({ error: error.message, field: "password" });
        return;
      }

      // Verificar estado del usuario
      if (!user.estado) {
        const error = new Error("La cuenta de usuario está inactiva, no puede iniciar sesión");
        res.status(401).json({ error: error.message, field: "general" });
        return;
      }

      const token = generateJWT({ id: user.id });
      res.send(token);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  static user = async (req: Request, res: Response) => {
    try {
       const user = await User.findById(req.user.id)
         .select('_id name apellido_paterno email dni role area empresas')
        .populate('role', 'name')
        .populate('area', 'name')
        .populate('empresas', 'nombre')
        .lean()

      res.json(user)
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener el perfil' })
    }
  };

  static getAllUsers = async (req: Request, res: Response) => {
    try {
      const offset = parseInt(req.query.offset as string) || 0
      const limit = parseInt(req.query.limit as string) || 10

      const total = await User.countDocuments()
      const users = await User.find()
        .select('_id name apellido_paterno apellido_materno telefono username dni email role area estado empresas')
        .populate('role', 'name')
        .populate('area', 'name')
        .populate('empresas', 'nombre')
        .skip(offset)
        .limit(limit)
        .lean()

      res.json({ users, total, offset, limit })
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener los usuarios' })
    }
  };

  static getUserById = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId)
        .select('_id name apellido_paterno apellido_materno telefono username dni email role area estado empresas')
        .populate('role', 'name')
        .populate('area', 'name')
        .populate('empresas', 'nombre')
        .lean();

      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
      }

      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener el usuario' });
    }
  };

  static updateUserStatus = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params
      const { estado } = req.body

      const estadoValue = typeof estado === 'string' ? estado === 'true' : estado

      const user = await User.findByIdAndUpdate(
        userId,
        { estado: estadoValue },
        { new: true }
      )

      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado' })
        return
      }

      if (estadoValue === false) {
        try {
          getIO().to(`user:${userId}`).emit('force-logout', {
            message: 'Tu cuenta ha sido desactivada por un administrador'
          })
        } catch {
          // Socket.IO no inicializado, continuar normalmente
        }
      }

      res.json({
        message: 'Usuario actualizado',
        user: {
          _id: user._id,
          estado: user.estado
        }
      })
    } catch (error) {
      console.log(error)
       res.status(500).json({ error: 'Error al actualizar el usuario' })
    }
  };

  static updateUserProfile = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params
      const updateData = { ...req.body }

      delete updateData.password

      // Si se está actualizando el rol
      if (updateData.role) {
        const roleDoc = await Role.findById(updateData.role);
        if (!roleDoc) {
          res.status(400).json({ error: `Rol con ID '${updateData.role}' no existe` });
          return;
        }
        // updateData.role ya es el _id, no requiere conversión adicional
      }

      // Si se está actualizando el área
      if (updateData.area) {
        const areaDoc = await Area.findById(updateData.area);
        if (!areaDoc) {
          res.status(400).json({ error: `Área con ID '${updateData.area}' no existe` });
          return;
        }
      }

      if (updateData.email !== undefined) {
        if (updateData.email) {
          const emailExists = await User.findOne({ email: updateData.email })
          if (emailExists && emailExists._id.toString() !== userId) {
            res.status(409).json({ error: 'El email ya está en uso' })
            return
          }
        }
      }

       if (updateData.username) {
         const usernameExists = await User.findOne({ username: updateData.username })
         if (usernameExists && usernameExists._id.toString() !== userId) {
           res.status(409).json({ error: 'El username ya está en uso' })
           return
         }
       }

       if (updateData.dni !== undefined) {
         const dniExists = await User.findOne({ dni: updateData.dni })
         if (dniExists && dniExists._id.toString() !== userId) {
           res.status(409).json({ error: 'El DNI ya está en uso' })
           return
         }
       }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      ).populate('role', 'name').populate('area', 'name').populate('empresas', 'nombre')

      if (!updatedUser) {
        res.status(404).json({ error: 'Usuario no encontrado' })
        return
      }

      res.json(updatedUser)
    } catch (error) {
      res.status(500).json({ error: 'Error al actualizar el perfil del usuario' })
    }
  };

  static updateProfile = async (req: Request, res: Response) => {
    const { name, email } = req.body;

    if (email !== undefined && email) {
      const userExits = await User.findOne({ email });
      if (userExits && userExits.id.toString() !== req.user.id.toString()) {
        const error = new Error("El email ya está en uso");
        res.status(409).json({ error: error.message });
        return;
      }
    }

    req.user.name = name;
    if (email !== undefined) {
      req.user.email = email;
    }

    try {
      await req.user.save();
      res.status(200).json({ message: 'Perfil actualizado correctamente' });
    } catch (error) {
      res.status(500).json({ error: 'Error del servidor' });
    }
  };

  static updatePasswordProfile = async (req: Request, res: Response) => {
      const { current_password, password } = req.body

      const user = await User.findById(req.user.id)

      const isPasswordCorrect = await checkPassword(current_password, user.password)

      if(!isPasswordCorrect){
        const error = new Error('El password actual es incorrecto')
        res.status(401).json({error: error.message})
        return
      }

      user.password = await hashPassword(password)
      try {
        await user.save()
        res.status(200).json({ message: 'Password actualizado correctamente' })
      } catch (error) {
          res.status(500).json({ error: 'Hubo un error' })
      }
  }

  static checkPasswordProfile = async (req: Request, res: Response) => {
    const {password} = req.body

    const user = await User.findById(req.user.id)

    const isPasswordCorrect = await checkPassword(password, user.password)
    if(!isPasswordCorrect){
      const error = new Error('El password es incorrecto')
      res.status(401).json({error: error.message})
      return
    }

    res.send('Password correcto')
  }

  static getRoles = async (req: Request, res: Response) => {
    try {
      const roles = await Role.find().select('_id name').lean();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener los roles' });
    }
  }

  static getAreas = async (req: Request, res: Response) => {
    try {
      const areas = await Area.find().select('_id name').lean();
      res.json(areas);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener las áreas' });
    }
  }

  static resetUserPassword = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params
      const { password } = req.body

      const user = await User.findById(userId)
      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado' })
        return
      }

      user.password = await hashPassword(password)
      await user.save()

      try {
        getIO().to(`user:${userId}`).emit('force-logout', {
          message: 'Tu contraseña ha sido restablecida por un administrador'
        })
      } catch { }

      res.json({ message: 'Contraseña restablecida correctamente' })
    } catch (error) {
      res.status(500).json({ error: 'Error al restablecer la contraseña' })
    }
  }
}

