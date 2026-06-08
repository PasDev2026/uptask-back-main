import mongoose, {Document, Schema, Types} from "mongoose";
import Note from "./Note";
import { taskPriority, TaskPriority } from "../constants";

const taskStatus = {
    PENDING: 'pending',
    ON_HOLD: 'onHold',
    IN_PROGRESS: 'inProgress',
    UNDER_REVIEW: 'underReview',
    COMPLETED: 'completed',
} as const

export type TaskStatus = typeof taskStatus[keyof typeof taskStatus];

export interface ITask extends Document {
    name: string,
    description?: string  
    project: Types.ObjectId
    status: TaskStatus
    priority: TaskPriority
    completedBy: {
        user: Types.ObjectId,
        status: TaskStatus
    }[]
    assignedTo: Types.ObjectId[]
    startDate?: Date
    dueDate?: Date
    parentTask: Types.ObjectId | null
    ancestors: Types.ObjectId[]
    order: number
}

export const TaskSchema: Schema = new Schema({
    name: {
        type: String,
        trim: true,
        required: true
    },
    description: {
        type: String,
        trim: true,
        required: false,
    },
    project: {
        type: Types.ObjectId,
        ref: 'Project',
    },
    status: {
        type: String,
        enum: Object.values(taskStatus),
        default: taskStatus.PENDING
    },
    priority: {
        type: String,
        enum: Object.values(taskPriority),
        default: taskPriority.MEDIUM
    },
    completedBy: [ //quien cambió el estado de la tarea
        {
            user : {
                type: Types.ObjectId,
                ref: 'User',
                default: null
            },
            status: {
                type: String,
                enum: Object.values(taskStatus),
                default: taskStatus.PENDING
            }
        }
    ],
    assignedTo: [
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
    parentTask: {
        type: Types.ObjectId,
        ref: 'Task',
        default: null
    },
    ancestors: [{
        type: Types.ObjectId,
        ref: 'Task'
    }],
    order: {
        type: Number,
        default: 0
    }
}, {timestamps: true})

TaskSchema.index({ project: 1, status: 1 })
TaskSchema.index({ project: 1, priority: 1 })
TaskSchema.index({ project: 1, status: 1, priority: 1 })
TaskSchema.index({ project: 1, startDate: 1 })
TaskSchema.index({ project: 1, dueDate: 1 })
TaskSchema.index({ project: 1, parentTask: 1, order: 1 })
TaskSchema.index({ ancestors: 1 })
TaskSchema.index({ assignedTo: 1 })

// Middleware
// Elimina las notas de la tarea y de todas sus subtareas descendientes
TaskSchema.pre('deleteOne', {document: true}, async function() {
    const taskId = this._id
    if(!taskId) return 

    await Note.deleteMany({task: taskId})

    // Eliminar todas las tareas descendientes (hijos, nietos, etc.)
    const descendants = await Task.find({ ancestors: taskId })
    const descendantIds = descendants.map(d => d._id)

    if (descendantIds.length > 0) {
        await Note.deleteMany({ task: { $in: descendantIds } })
        await Task.deleteMany({ _id: { $in: descendantIds } })
    }
})

TaskSchema.statics.attachSubtaskCounts = async function(tasks: ITask[]) {
    const taskIds = tasks.map(t => t._id)
    if (taskIds.length === 0) return tasks.map(t => ({ ...t.toObject(), subtaskCount: 0 }))

    const counts = await this.aggregate([
        { $match: { parentTask: { $in: taskIds } } },
        { $group: { _id: '$parentTask', count: { $sum: 1 } } }
    ])

    const map = new Map(counts.map((c: { _id: Types.ObjectId, count: number }) => [c._id.toString(), c.count]))
    return tasks.map(t => ({ ...t.toObject(), subtaskCount: map.get(t._id.toString()) || 0 }))
}

const Task = mongoose.model<ITask>('Task', TaskSchema )
export default Task