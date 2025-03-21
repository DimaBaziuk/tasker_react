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
            <h3 className="taskBlockName">
                {listName} {dataTask.length}
            </h3>
            <div className="taskList">
                {dataTask.length ? (
                    <>
                        {dataTask.map((task) => (
                            <TaskBar task={task} key={task.id} />
                        ))}
                    </>
                ) : (
                    <div className="emtyListBlock">
                        <p>empty list</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskList;
