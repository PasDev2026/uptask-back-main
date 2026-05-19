import type {Request, Response, NextFunction} from 'express'
import Project, { IProject } from "../model/Project";


declare global {
    namespace Express { //<- reescribiendo
        interface Request {
            project: IProject
        }
    }
}


export async function validateProjectExists(req:Request, res:Response, next:NextFunction) {
    try {
        const {projectId} = req.params
        const project = await Project.findById(projectId)
        if(!project){
            const error = new Error('No existe el proyecto')
            res.status(404).json({error: error.message});
            return 
        }
        req.project = project
        next()
    } catch (error) {
        console.log(error);
        res.status(500).json({message: error.message});
    }
}