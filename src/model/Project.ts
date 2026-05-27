import mongoose, { Schema, Document, PopulatedDoc, Types } from "mongoose";
import Task from "./Task";
import { IUser } from "./User";
import Note from "./Note";
import { projectStatus, ProjectStatus, taskPriority, TaskPriority } from "../constants";


export interface IProject extends Document  {
    projectName : string
    clientName : string
    description : string
    manager: PopulatedDoc<IUser & Document>
    team: PopulatedDoc<IUser & Document>[]
    responsible: PopulatedDoc<IUser & Document>[]
    empresa: Types.ObjectId
    startDate?: Date
    dueDate?: Date
    status: ProjectStatus
    priority: TaskPriority
}

const ProjectSchema:Schema = new Schema({
    projectName: {
        type: String,
        required: true,
        trim    : true,
    },
    clientName: {
        type: String,
        required: true,
        trim    : true,
    },
    description: {
        type: String,
        required: true,
        trim    : true,
    },
    manager: {
        type: Types.ObjectId,
        ref: 'User'
    },
    team: [
        {
            type: Types.ObjectId,
            ref: 'User'
        }
    ],
    responsible: [
        {
            type: Types.ObjectId,
            ref: 'User'
        }
    ],
    startDate: {
        type: Date,
        required: false
    },
    dueDate: {
        type: Date,
        required: false
    },
    status: {
        type: String,
        enum: Object.values(projectStatus),
        default: projectStatus.PLANNING
    },
    priority: {
        type: String,
        enum: Object.values(taskPriority),
        default: taskPriority.MEDIUM
    },
    empresa: {
        type: Types.ObjectId,
        ref: 'Empresa',
        required: true
    },
}, {timestamps: true})

ProjectSchema.index({ startDate: 1 })
ProjectSchema.index({ dueDate: 1 })


// Middleware
// Elimina las 
ProjectSchema.pre('deleteOne', {document: true}, async function() {
    const projectId = this._id
    if(!projectId) return 

    const tasks = await Task.find({project: projectId})
    for(const task of tasks){
        await Note.deleteMany({task: task._id})
    }

    await Task.deleteMany({project: projectId})
    console.log(this._id)
})

const Project = mongoose.model<IProject>('Project', ProjectSchema);
export default Project;