import type { Request, Response } from "express";
import User from "../model/User";
import Role from "../model/role";
import { checkPassword, hashPassword } from "../utils/bcrypt";
import { generateJWT } from "../utils/jwt";
import mongoose from 'mongoose';

export class UserController {
  static createUserByAdmin = async (req: Request, res: Response) => {
    try {
      const { password, email, username, dni, role: roleName } = req.body;

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

      await user.save();

      res.send("Usuario creado correctamente");
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  static login = async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const user = await User.findOne({ username });
      if (!user) {
        const error = new Error("El usuario no existe");
        res.status(401).json({ error: error.message });
        return;
      }

      // Revisar password
      const isPasswordCorrect = await checkPassword(password, user.password);
      if (!isPasswordCorrect) {
        const error = new Error("Password Incorrecto");
        res.status(401).json({ error: error.message });
        return;
      }

      // Verificar estado del usuario
      if (!user.estado) {
        const error = new Error("La cuenta de usuario está inactiva, no puede iniciar sesión");
        res.status(401).json({ error: error.message });
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
         .select('_id name email dni role empresas')
        .populate('role', 'name')
        .populate('empresas', 'nombre')
        .lean()

      res.json(user)
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener el perfil' })
    }
  };

  static getAllUsers = async (req: Request, res: Response) => {
    try {
       const users = await User.find()
         .select('_id name apellido_paterno apellido_materno telefono username dni email role estado empresas')
        .populate('role', 'name')
        .populate('empresas', 'nombre')
        .lean()

      res.json(users)
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener los usuarios' })
    }
  };

  static getUserById = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId)
        .select('_id name apellido_paterno apellido_materno telefono username dni email role estado empresas')
        .populate('role', 'name')
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
      ).populate('role', 'name').populate('empresas', 'nombre')

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
      res.send("Perfil actualizado correctamente");
    } catch (error) {
      res.status(500).json({ error: error.message });
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
        res.send('Password actualizado correctamente')
      } catch (error) {
          res.status(500).send('Hubo un error')
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
}

