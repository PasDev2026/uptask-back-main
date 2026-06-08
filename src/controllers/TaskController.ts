import type { Request, Response } from "express";
import mongoose from "mongoose";

import Task from "../model/Task";
import Note from "../model/Note";
import Project from "../model/Project";
import User from "../model/User";
import { TaskService } from "../services/TaskService";


export class TaskController {

    static createTask = async(req: Request, res: Response) => {
        try {
            const task = new Task(req.body);
            task.project = req.project.id

            const { parentTask } = req.body
            if (parentTask) {
                const parent = await Task.findById(parentTask)
                if (!parent) {
                    res.status(404).json({ error: 'La tarea padre no existe' })
                    return
                }
                if (parent.project.toString() !== req.project.id) {
                    res.status(400).json({ error: 'La tarea padre no pertenece al proyecto' })
                    return
                }

                task.parentTask = parentTask
                task.ancestors = [
                    ...(parent.ancestors || []) as mongoose.Types.ObjectId[],
                    parent._id as mongoose.Types.ObjectId
                ]

                const lastSibling = await Task.findOne({ parentTask }).sort({ order: -1 })
                task.order = lastSibling ? lastSibling.order + 1 : 0
            } else {
                task.parentTask = null
                task.ancestors = []

                const lastRootTask = await Task.findOne({
                    project: req.project.id,
                    parentTask: null
                }).sort({ order: -1 })
                task.order = lastRootTask ? lastRootTask.order + 1 : 0
            }

            const dateErrors = await TaskService.validateTaskDates(
                req.body, req.project.id, req.body.parentTask
            )
            if (dateErrors.length > 0) {
                res.status(400).json({ error: dateErrors.join('. ') })
                return
            }

            await task.save()
            res.status(201).json({ message: 'Tarea creada correctamente' })
        } catch (error) {
                console.log(error);
                res.status(500).json({ error: 'Error del servidor' })
        }
    }

    static getTaskById = async(req:Request, res:Response) => {
        try {
            const [task, notes] = await Promise.all([
                Task.findById(req.params.taskId)
                    .populate({path: 'completedBy.user', select: 'id name apellido_paterno email'})
                    .populate('assignedTo', '_id name apellido_paterno email'),
                Note.find({task: req.params.taskId})
                    .populate('createdBy', 'id name apellido_paterno email')
            ])
            res.json({ ...task?.toObject(), notes });
        } catch (error) {
            res.status(500).json({error: error.message})
        }
    }
    
    static updateTask = async(req:Request, res:Response) => {
        try {
            req.task.name = req.body.name
            req.task.description = req.body.description
            if (req.body.startDate !== undefined) {
                req.task.startDate = req.body.startDate
            }
            if (req.body.dueDate !== undefined) {
                req.task.dueDate = req.body.dueDate
            }
            if (req.body.priority !== undefined) {
                req.task.priority = req.body.priority
            }

            const dateErrors = await TaskService.validateTaskDates(
                { startDate: req.task.startDate, dueDate: req.task.dueDate },
                req.project.id,
                req.task.parentTask?.toString()
            )
            if (dateErrors.length > 0) {
                res.status(400).json({ error: dateErrors.join('. ') })
                return
            }

            await req.task.save()
            res.status(200).json({ message: 'Tarea actualizada correctamente' })
        } catch (error) {
            res.status(500).json({ error: 'Error del servidor' })
        }
    }

    static deleteTask = async(req:Request, res:Response) => {
        try {
            await req.task.deleteOne()
            res.status(200).json({ message: 'Tarea eliminada correctamente' })
        } catch (error) {
            res.status(500).json({ error: 'Error del servidor' })
        }
    }

    static changeStatusTask = async(req:Request, res:Response) => {
        try {
            const {status} = req.body
            const result = await TaskService.changeStatus(
                req.task.id,
                status,
                req.user.id,
                req.project.id
            )
            if (!result) {
                res.status(404).json({error: 'Tarea no encontrada'})
                return
            }
            res.json({
                message: 'Estado de la tarea actualizado',
                progress: result.progress
            })
        } catch (error) {
            res.status(500).json({ error: 'Error del servidor' })
        }
    }

    static getSubtasks = async(req:Request, res:Response) => {
        try {
            const subtasks = await Task.find({ parentTask: req.params.taskId })
                .populate({path: 'completedBy.user', select: 'id name apellido_paterno email'})
                .populate('assignedTo', '_id name apellido_paterno email')
                .sort({ order: 1 })
            const subtasksWithCounts = await (Task as any).attachSubtaskCounts(subtasks)
            res.json(subtasksWithCounts)
        } catch (error) {
            res.status(500).json({error: error.message})
        }
    }

    static getTaskTree = async(req:Request, res:Response) => {
        try {
            const tasks = await Task.find({
                $or: [
                    { _id: req.params.taskId },
                    { ancestors: req.params.taskId }
                ]
            })
            .populate({path: 'completedBy.user', select: 'id name apellido_paterno email'})
            .populate('assignedTo', '_id name apellido_paterno email')
            .sort({ order: 1 })

            if (!tasks.length) {
                res.status(404).json({ error: 'Tarea no encontrada' })
                return
            }

            res.json(tasks)
        } catch (error) {
            res.status(500).json({error: error.message})
        }
    }

    static moveTask = async(req:Request, res:Response) => {
        try {
            const { newParentTask } = req.body

            if (newParentTask === req.params.taskId) {
                res.status(400).json({ error: 'Una tarea no puede ser padre de sí misma' })
                return
            }

            const valid = await TaskService.validateNoCycle(req.params.taskId, newParentTask)
            if (!valid) {
                res.status(400).json({ error: 'Esta operación crearía un ciclo en la jerarquía' })
                return
            }

            const newParent = await Task.findById(newParentTask)
            if (!newParent) {
                res.status(404).json({ error: 'La tarea padre no existe' })
                return
            }
            if (newParent.project.toString() !== req.project.id) {
                res.status(400).json({ error: 'La tarea padre no pertenece al proyecto' })
                return
            }

            const task = await Task.findById(req.params.taskId)
            if (!task) {
                res.status(404).json({ error: 'Tarea no encontrada' })
                return
            }

            const newAncestors: mongoose.Types.ObjectId[] = [
                ...(newParent.ancestors || []) as mongoose.Types.ObjectId[],
                newParent._id as mongoose.Types.ObjectId
            ]
            const oldTaskId = req.task._id

            task.parentTask = newParentTask
            task.ancestors = newAncestors
            await task.save()

            const descendants = await Task.find({ ancestors: oldTaskId })
            for (const descendant of descendants) {
                const taskIdxInDesc = descendant.ancestors.findIndex(
                    a => a.toString() === oldTaskId.toString()
                )

                if (taskIdxInDesc !== -1) {
                    const suffix = (descendant.ancestors as mongoose.Types.ObjectId[]).slice(taskIdxInDesc)
                    descendant.ancestors = [
                        ...newAncestors,
                        ...suffix
                    ] as mongoose.Types.ObjectId[]
                    await descendant.save()
                }
            }

            res.status(200).json({ message: 'Tarea movida correctamente' })
        } catch (error) {
            res.status(500).json({error: error.message})
        }
    }

    static updateTaskDates = async(req: Request, res: Response) => {
        try {
            if (req.body.startDate !== undefined) req.task.startDate = req.body.startDate;
            if (req.body.dueDate !== undefined) req.task.dueDate = req.body.dueDate;

            const dateErrors = await TaskService.validateTaskDates(
                { startDate: req.task.startDate, dueDate: req.task.dueDate },
                req.project.id,
                req.task.parentTask?.toString()
            );
            if (dateErrors.length > 0) {
                res.status(400).json({ error: dateErrors.join('. ') });
                return;
            }

            await req.task.save();
            res.status(200).json({ message: 'Fechas de la tarea actualizadas correctamente' });
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error del servidor' });
        }
    }

    static updateTaskPriority = async(req: Request, res: Response) => {
        try {
            req.task.priority = req.body.priority ?? null;
            await req.task.save();
            res.status(200).json({ message: 'Prioridad actualizada correctamente' });
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error del servidor' });
        }
    }

    static assignTask = async(req:Request, res:Response) => {
        try {
            const { userIds } = req.body as { userIds: string[] }

            if (!Array.isArray(userIds)) {
                res.status(400).json({ error: 'Se requiere un array de userIds' })
                return
            }

            const validUsers = await User.find({
                _id: { $in: userIds },
                empresas: req.project.empresa
            }).select('_id').lean()

            if (validUsers.length !== userIds.length) {
                res.status(400).json({ error: 'Uno o más usuarios no pertenecen a la sede del proyecto' })
                return
            }

            req.task.assignedTo = userIds as any
            await req.task.save()

            res.status(200).json({ message: 'Responsables asignados correctamente' })
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: 'Error del servidor' })
        }
    }

    static reorderTasks = async(req:Request, res:Response) => {
        try {
            const { tasks } = req.body

            if (!Array.isArray(tasks) || tasks.length === 0) {
                res.status(400).json({ error: 'Se requiere un array de tareas con orden' })
                return
            }

            const operations = tasks.map((t: { id: string, order: number }) => ({
                updateOne: {
                    filter: { _id: t.id, project: req.project.id },
                    update: { $set: { order: t.order } }
                }
            }))

            await Task.bulkWrite(operations)
            res.send('Orden actualizado correctamente')
        } catch (error) {
            res.status(500).json({error: error.message})
        }
    }

}
