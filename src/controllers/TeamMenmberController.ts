import {Request, Response} from 'express'
import User from '../model/User'
import Project from '../model/Project'
export class TeamMemberController {

    static getAllTeamMember = async(req: Request, res: Response) => {
        const project = await Project.findById(req.project.id).populate({
            path: 'team',
            select: ' id email name'
        })
        res.json(project.team)
    }

    static findMemberByEmail = async (req: Request, res: Response) => {
        const { email } = req.body
        //Find user
        const user = await User.findOne({email}).select('_id name email')
        if(!user){
            const error = new Error('Usuario no encontrado')
            res.status(404).json({error: error.message});
            return 
        }
        res.json(user)
    }
    
    static addTeamMember = async (req: Request, res: Response) => {
        const { id } = req.body
        //Find user
        const user = await User.findById(id).select('id')
        if(!user){
            const error = new Error('Usuario no encontrado')
            res.status(404).json({error: error.message});
            return 
        }

        if(req.project.team.some(team => team.toString() === user.id.toString())) {
            const error = new Error('El usuario ya existe en el proyecto')
            res.status(409).json({error: error.message});
            return 
        }

        req.project.team.push(user.id)
        await req.project.save()

        res.send('Usuario agregado correctamente')
    }

    static removeMemberById = async (req: Request, res: Response) => { 
        const { userId } = req.params

        if(!req.project.team.some(team => team.toString() === userId)) {
            const error = new Error('El usuario NO existe en el proyecto')
            res.status(409).json({error: error.message});
            return 
        }
        req.project.team = req.project.team.filter(teamMember => teamMember.toString() !== userId)
        await req.project.save()
        res.send('Usuario eliminado correctamente')
    }

    static getProjectMembers = async (req: Request, res: Response) => {
        try {
            const project = await Project.findById(req.project.id)
                .populate('manager', '_id name email')
                .populate('team', '_id name email')
            res.json({
                manager: project.manager,
                team: project.team,
            })
        } catch (error) {
            res.status(500).json({ error: 'Error del servidor' })
        }
    }

}