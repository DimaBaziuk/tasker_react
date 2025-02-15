import React from "react";
import { TaskType } from "./taskType";
import TaskBar from "./TaskBar";

type TaskListType = {
    dataTask: TaskType[];
    listName: string;
};

const TaskList: React.FC<TaskListType> = ({ dataTask, listName }) => {
    return (
        <div className="tasklistBlock">
            <h3 className="taskBlockName">{listName}</h3>
            <div className="taskList">
                {dataTask.length ? (
                    <>
                        {dataTask.map((task) => (
                            <TaskBar task={task} />
                        ))}
                    </>
                ) : null}
            </div>
        </div>
    );
};

export default TaskList;
