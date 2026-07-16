import type { Project } from "../../../types/project";

export const getProjectDuration = (project: Project) => {


  const startDate = new Date(project.date_start).getTime();
  const endDate = new Date(project.date_end).getTime();
  const currentDate = new Date().getTime();

  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 *24));
  const elapsedDays = Math.ceil((currentDate - startDate) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.max(0, Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24)));
    
  const progressPercentage = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

  return {
    totalDays,
    elapsedDays: Math.max(0, elapsedDays),
    remainingDays,
    progressPercentage,
    startDate: project.date_start,
    endDate: project.date_end,
    isOverdue: currentDate > endDate,
  };
}