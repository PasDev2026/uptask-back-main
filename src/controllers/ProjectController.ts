import { Request, Response } from "express";
import Project from "../model/Project";
import Task from "../model/Task";
import { ProjectService } from "../services/ProjectService";

export class ProjectController {

  
  //Obtener todos los proyectos
  static getAllProject = async (req: Request, resp: Response) => {
    try {
      const search = req.query.search as string | undefined;
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;
      const empresa = req.query.empresa as string | undefined;
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;
      const { projects, total } = await ProjectService.findAllForUser(req.user.id, search, dateFrom, dateTo, empresa, offset, limit, req.user.empresas)
      resp.json({ projects, total });
    } catch (error) {
      console.log(error);
      resp.status(500).json({ error: error.message });
    }
  };

  //creando proyecto
  static createProject = async (req: Request, res: Response) => {
    const { empresa } = req.body

    if (!empresa) {
      res.status(400).json({ error: 'La empresa es obligatoria' })
      return
    }

    const userEmpresas = req.user.empresas.map(e => e.toString())
    if (!userEmpresas.includes(empresa)) {
      res.status(403).json({ error: 'No perteneces a la empresa seleccionada' })
      return
    }

    const project = new Project(req.body);
 
    //Asigna un manager
    project.manager = req.user.id //asigna el id del manager

    //Responsable por defecto es el manager
    project.responsible = [req.user.id]

    //Asigna la empresa
    project.empresa = empresa

    //Si no se envía startDate, se asigna la fecha actual
    if (!req.body.startDate) {
      project.startDate = new Date()
    }
    
    if (!project) {
      const error = new Error('Proyecto no encontrado');
      res.status(404).json({ error: error.message });
      return;
    }
 
    try {
      await project.save();
      res.status(201).send('Proyecto creado correctamente');
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
 
  };

  static getProjectById = async(req: Request, res: Response) => {
    const { id } = req.params
    try {
      const project = await Project.findById(id).populate('responsible', '_id name email');

      if(!project){
        const error = new Error('Proyecto no encontrado')
        res.status(404).json({error: error.message})
        return
      }

      const userEmpresas = req.user.empresas.map(e => e.toString())
      if (!userEmpresas.includes(project.empresa.toString())) {
        const error = new Error('No se relacionan')
        res.status(404).json({error: error.message})
        return
      }

      const tasks = await Task.find({ project: id }).populate('assignedTo', '_id name email')
      const totalTasks = tasks.length
      const completedTasks = tasks.filter(t => t.status === 'completed').length
      const progress = {
        percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        completedTasks,
        totalTasks
      }
      const isOverdue = project.dueDate ? project.dueDate < new Date() : false

      res.json({ ...project.toObject(), tasks, progress, isOverdue });
    } catch (error) {
      console.log(error);
    }
  }

  static getProjectTasksPreview = async (req: Request, res: Response) => {
    const { id } = req.params
    try {
      const project = await Project.findById(id)

      if (!project) {
        res.status(404).json({ error: 'Proyecto no encontrado' })
        return
      }

      const userEmpresas = req.user.empresas.map(e => e.toString())
      if (!userEmpresas.includes(project.empresa.toString())) {
        res.status(403).json({ error: 'No autorizado' })
        return
      }

      const tasks = await Task.find({ project: id })
        .select('_id name description status priority startDate dueDate parentTask order assignedTo')
        .populate('assignedTo', '_id name email')
        .sort({ status: 1, createdAt: -1 })

      const totalTasks = tasks.length
      const completedTasks = tasks.filter(t => t.status === 'completed').length

      res.json({
        tasks,
        total: totalTasks,
        progress: {
          percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          completedTasks,
          totalTasks
        }
      })
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: 'Error del servidor' })
    }
  }

  static updateProject = async(req: Request, res: Response) => {

    try {
      const newStartDate = req.body.startDate !== undefined ? new Date(req.body.startDate) : null
      const newDueDate = req.body.dueDate !== undefined ? new Date(req.body.dueDate) : null

      if (newStartDate) {
        const tasksBefore = await Task.find({
          project: req.project._id,
          startDate: { $lt: newStartDate, $ne: null }
        }).select('name')
        if (tasksBefore.length > 0) {
          res.status(400).json({
            error: `No se puede adelantar la fecha de inicio. ${tasksBefore.length} tarea(s) tienen fecha de inicio anterior: ${tasksBefore.map(t => t.name).join(', ')}`
          })
          return
        }
      }

      if (newDueDate) {
        const tasksAfter = await Task.find({
          project: req.project._id,
          dueDate: { $gt: newDueDate, $ne: null }
        }).select('name')
        if (tasksAfter.length > 0) {
          res.status(400).json({
            error: `No se puede retrasar la fecha límite. ${tasksAfter.length} tarea(s) tienen fecha límite posterior: ${tasksAfter.map(t => t.name).join(', ')}`
          })
          return
        }
      }

      req.project.clientName = req.body.clientName
      req.project.projectName = req.body.projectName
      req.project.description = req.body.description
      if (req.body.startDate !== undefined) {
        req.project.startDate = req.body.startDate
      }
      if (req.body.dueDate !== undefined) {
        req.project.dueDate = req.body.dueDate
      }
      await req.project.save();
      res.status(200).send("Proyecto actualizado correctamente");
    } catch (error) {
      console.log(error);
    }
  }

  static deleteProject = async(req: Request, res: Response) => {
    
    try {
      await req.project.deleteOne()
      res.send("Proyecto eliminado correctamente");
    } catch (error) {
      console.log(error);
    }
  }

    static updateProjectDates = async (req: Request, res: Response) => {
    const { id } = req.params
    const updateData: { startDate?: string | null; dueDate?: string | null } = {}

    if (req.body.startDate !== undefined) updateData.startDate = req.body.startDate
    if (req.body.dueDate !== undefined) updateData.dueDate = req.body.dueDate

    try {
      const project = await Project.findByIdAndUpdate(id, { $set: updateData }, { new: true })
      if (!project) {
        res.status(404).json({ error: 'Proyecto no encontrado' })
        return
      }
      res.json(project)
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: 'Error del servidor' })
    }
  }

    static updateProjectStatus = async (req: Request, res: Response) => {
    const { id } = req.params
    try {
      const project = await Project.findByIdAndUpdate(
        id,
        { $set: { status: req.body.status } },
        { new: true }
      )
      if (!project) {
        res.status(404).json({ error: 'Proyecto no encontrado' })
        return
      }
      res.status(200).send('Estado actualizado correctamente')
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: 'Error del servidor' })
    }
  }

  static updateProjectPriority = async (req: Request, res: Response) => {
    const { id } = req.params
    try {
      const project = await Project.findByIdAndUpdate(
        id,
        { $set: { priority: req.body.priority ?? null } },
        { new: true }
      )
      if (!project) {
        res.status(404).json({ error: 'Proyecto no encontrado' })
        return
      }
      res.status(200).send('Prioridad actualizada correctamente')
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: 'Error del servidor' })
    }
  }

  static updateProjectResponsible = async (req: Request, res: Response) => {
    const { userIds } = req.body as { userIds: string[] }

    if (!Array.isArray(userIds)) {
      res.status(400).json({ error: 'Se requiere un array de userIds' })
      return
    }

    try {
      const project = req.project

      const validTeamIds = new Set([
        project.manager.toString(),
        ...project.team.map((m) => m.toString())
      ])

      const allValid = userIds.every(id => validTeamIds.has(id))
      if (!allValid) {
        res.status(400).json({ error: 'Uno o más usuarios no pertenecen al proyecto' })
        return
      }

      project.responsible = userIds as any
      await project.save()

      res.status(200).json({ message: 'Responsables actualizados correctamente' })
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: 'Error del servidor' })
    }
  }
}
