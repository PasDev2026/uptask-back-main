import { Types } from "mongoose";
import Task, { TaskStatus } from "../model/Task";
import Project from "../model/Project";
import { ProjectService } from "./ProjectService";

export class TaskService {

  static async changeStatus(
    taskId: string,
    status: TaskStatus,
    userId: string,
    projectId: string
  ) {
    const task = await Task.findById(taskId);
    if (!task) return null;

    task.status = status;
    task.completedBy.push({ user: new Types.ObjectId(userId), status });
    await task.save();

    const progress = await ProjectService.getProjectProgress(projectId);

    return { task, progress };
  }

  static async validateNoCycle(taskId: string, newParentId: string): Promise<boolean> {
    if (taskId === newParentId) return false;
    const newParent = await Task.findById(newParentId).select('ancestors');
    if (!newParent) return false;
    if (newParent.ancestors.some(a => a.toString() === taskId)) return false;
    return true;
  }

  static async validateTaskDates(
    taskData: { startDate?: Date | string | null; dueDate?: Date | string | null },
    projectId: string,
    parentTaskId?: string | null
  ): Promise<string[]> {
    const errors: string[] = [];

    if (!taskData.startDate && !taskData.dueDate) return errors;

    const project = await Project.findById(projectId).select('startDate dueDate');
    if (!project) {
      errors.push('Proyecto no encontrado');
      return errors;
    }

    const startDate = taskData.startDate ? new Date(taskData.startDate) : null;
    const dueDate = taskData.dueDate ? new Date(taskData.dueDate) : null;

    if (startDate && dueDate && startDate > dueDate) {
      errors.push('La fecha de inicio no puede ser posterior a la fecha límite');
    }

    if (startDate && project.startDate && startDate < project.startDate) {
      errors.push(`La fecha de inicio (${startDate.toLocaleDateString()}) no puede ser anterior al inicio del proyecto (${project.startDate.toLocaleDateString()})`);
    }

    if (dueDate && project.dueDate && dueDate > project.dueDate) {
      errors.push(`La fecha límite (${dueDate.toLocaleDateString()}) no puede exceder la fecha límite del proyecto (${project.dueDate.toLocaleDateString()})`);
    }

    if (parentTaskId) {
      const parent = await Task.findById(parentTaskId).select('startDate dueDate');
      if (parent) {
        if (startDate && parent.startDate && startDate < parent.startDate) {
          errors.push(`La fecha de inicio (${startDate.toLocaleDateString()}) no puede ser anterior al inicio de la tarea padre (${parent.startDate.toLocaleDateString()})`);
        }
        if (dueDate && parent.dueDate && dueDate > parent.dueDate) {
          errors.push(`La fecha límite (${dueDate.toLocaleDateString()}) no puede exceder la fecha límite de la tarea padre (${parent.dueDate.toLocaleDateString()})`);
        }
      }
    }

    return errors;
  }
}
