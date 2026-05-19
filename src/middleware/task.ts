import type {Request, Response, NextFunction} from 'express'
import Task, { ITask } from "../model/Task";


declare global {
    namespace Express { //<- reescribiendo
        interface Request {
            task: ITask
        }
    }
}


export async function tasktExists(req:Request, res:Response, next:NextFunction) {
    try {
        const {taskId} = req.params
        const task = await Task.findById(taskId)
        if(!task){
            const error = new Error('No existe el proyecto')
            res.status(404).json({error: error.message});
            return 
        }
        req.task = task
        next()
    } catch (error) {
        console.log(error);
        res.status(500).json({message: error.message});
    }
}

//verificar si una tarea pertenece a su proyecto
export function taskBelongToProject(req:Request, res:Response, next:NextFunction){
    if(req.task.project.toString() !== req.project.id.toString()){
        const error = new Error('La tarea no pertenece al proyecto')
        res.status(404).json({error: error.message});
        return
    }
    next()
}


export function hasAuthorization(req:Request, res:Response, next:NextFunction){
    if( req.user.id.toString() !== req.project.manager.toString() ){
        const error = new Error('No tienes permiso!')
        res.status(404).json({error: error.message});
        return
    }
    next()
}

export function isProjectMember(req:Request, res:Response, next:NextFunction){
    const isManager = req.user.id.toString() === req.project.manager.toString()
    const isTeamMember = req.project.team.some((m) => m.toString() === req.user.id.toString())
    if (!isManager && !isTeamMember) {
        const error = new Error('No perteneces a este proyecto')
        res.status(403).json({error: error.message});
        return
    }
    next()
}