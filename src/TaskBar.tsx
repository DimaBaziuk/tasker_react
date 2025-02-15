import React from "react";
import { Button } from "antd";
import { TaskType } from "./taskType";

type taskT = {
    task: TaskType;
};

const TaskBar: React.FC<taskT> = ({ task }) => {
    return (
        <div className="taskBar">
            <div className="topBlock">
                <div className="nameBlock">{task.name}</div>
                <div className="buttonsBlock">
                    <Button>done</Button>
                    <Button>delete</Button>
                </div>
            </div>
            <div className="descriptionBlock">{task.description}</div>
        </div>
    );
};

export default TaskBar;
