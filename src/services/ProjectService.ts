import { Types, type PipelineStage } from "mongoose";
import Project from "../model/Project";

export interface ProjectProgress {
  percentage: number;
  completedTasks: number;
  totalTasks: number;
}

export class ProjectService {

  static async findAllWithProgress(filter: Record<string, unknown>, offset = 0, limit = 0) {
    const now = new Date();
    const pipeline: PipelineStage[] = [
      { $match: filter } as PipelineStage,
    ];
    if (offset > 0) pipeline.push({ $skip: offset } as PipelineStage);
    if (limit > 0) pipeline.push({ $limit: limit } as PipelineStage);
    pipeline.push(
      {
        $lookup: {
          from: "tasks",
          localField: "_id",
          foreignField: "project",
          as: "tasks",
        },
      },
      {
        $addFields: {
          totalTasks: { $size: "$tasks" },
          completedTasks: {
            $size: {
              $filter: {
                input: "$tasks",
                as: "task",
                cond: { $eq: ["$$task.status", "completed"] },
              },
            },
          },
        },
      },
      {
        $addFields: {
          progress: {
            percentage: {
              $cond: {
                if: { $gt: ["$totalTasks", 0] },
                then: {
                  $round: [
                    {
                      $multiply: [
                        { $divide: ["$completedTasks", "$totalTasks"] },
                        100,
                      ],
                    },
                    0,
                  ],
                },
                else: 0,
              },
            },
            completedTasks: "$completedTasks",
            totalTasks: "$totalTasks",
          },
          isOverdue: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$dueDate", null] },
                  { $lt: ["$dueDate", now] },
                ],
              },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "responsible",
          foreignField: "_id",
          pipeline: [
            { $project: { _id: 1, name: 1, email: 1 } }
          ],
          as: "responsible",
        },
      },
      {
        $project: {
          tasks: 0,
          totalTasks: 0,
          completedTasks: 0,
        },
      },
    );

    const projects = await Project.aggregate(pipeline);

    return projects;
  }

  static async findAllForUser(userId: string, search?: string, dateFrom?: string, dateTo?: string, offset = 0, limit = 10) {
    const userObjectId = new Types.ObjectId(userId);

    const userProjects = await Project.find({
      $or: [
        { manager: userObjectId },
        { team: { $in: [userObjectId] } }
      ]
    }).select('_id');

    const projectIds = userProjects.map(p => p._id);
    if (projectIds.length === 0) return { projects: [], total: 0 };

    const filter: Record<string, unknown> = { _id: { $in: projectIds } };
    if (search) {
      filter.projectName = { $regex: search, $options: 'i' };
    }

    if (dateFrom || dateTo) {
      const dateConditions: Record<string, unknown>[] = [];

      const startOfDay = (d: string) => { const date = new Date(d); date.setUTCHours(0, 0, 0, 0); return date; };
      const endOfDay = (d: string) => { const date = new Date(d); date.setUTCHours(23, 59, 59, 999); return date; };

      if (dateFrom && dateTo) {
        const from = startOfDay(dateFrom);
        const to = endOfDay(dateTo);
        dateConditions.push(
          { startDate: { $lte: to }, dueDate: { $gte: from } },
          { startDate: { $lte: to }, dueDate: null },
          { startDate: null, dueDate: { $gte: from } }
        );
      } else if (dateFrom) {
        const from = startOfDay(dateFrom);
        dateConditions.push(
          { dueDate: { $gte: from } },
          { dueDate: null }
        );
      } else if (dateTo) {
        const to = endOfDay(dateTo);
        dateConditions.push(
          { startDate: { $lte: to } },
          { startDate: null }
        );
      }

      filter.$or = dateConditions;
    }

    const total = await Project.countDocuments(filter);
    const projects = await ProjectService.findAllWithProgress(filter, offset, limit);
    return { projects, total };
  }

  static async findByIdWithProgress(id: string) {
    const projects = await ProjectService.findAllWithProgress({
      _id: new Types.ObjectId(id),
    });
    return projects[0] ?? null;
  }

  static async getProjectProgress(projectId: string): Promise<ProjectProgress> {
    const result = await Project.aggregate([
      { $match: { _id: new Types.ObjectId(projectId) } },
      {
        $lookup: {
          from: "tasks",
          localField: "_id",
          foreignField: "project",
          as: "tasks",
        },
      },
      {
        $project: {
          totalTasks: { $size: "$tasks" },
          completedTasks: {
            $size: {
              $filter: {
                input: "$tasks",
                as: "task",
                cond: { $eq: ["$$task.status", "completed"] },
              },
            },
          },
        },
      },
      {
        $addFields: {
          percentage: {
            $cond: {
              if: { $gt: ["$totalTasks", 0] },
              then: {
                $round: [
                  {
                    $multiply: [
                      { $divide: ["$completedTasks", "$totalTasks"] },
                      100,
                    ],
                  },
                  0,
                ],
              },
              else: 0,
            },
          },
        },
      },
    ]);

    if (result.length === 0) {
      return { percentage: 0, completedTasks: 0, totalTasks: 0 };
    }

    return {
      percentage: result[0].percentage,
      completedTasks: result[0].completedTasks,
      totalTasks: result[0].totalTasks,
    };
  }
}
