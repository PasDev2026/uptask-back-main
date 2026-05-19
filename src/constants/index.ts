export const projectStatus = {
    PLANNING: 'planning',
    ACTIVE: 'active',
    ON_HOLD: 'onHold',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
} as const
export type ProjectStatus = typeof projectStatus[keyof typeof projectStatus]

export const taskPriority = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
} as const
export type TaskPriority = typeof taskPriority[keyof typeof taskPriority]
