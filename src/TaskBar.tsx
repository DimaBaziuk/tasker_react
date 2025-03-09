import React from "react";
import { TaskType } from "./taskType";

import TaskBarButtons from "./TaskBarButtons";

type taskT = {
    task: TaskType;
};

const TaskBar: React.FC<taskT> = ({ task }) => {
    return (
        <div className="taskBar">
            <div className="topBlock">
                <div className="nameBlock"> Name: {task.name}</div>
                <TaskBarButtons taskId={task.id!} taskStatus={task.status} />
            </div>
            <div className="descriptionBlock">
                Description: {task.description}
            </div>
        </div>
    );
};

export default TaskBar;
