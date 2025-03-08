import React from "react";
import { Button } from "antd";
import { TaskType } from "./taskType";

import {
    DeleteOutlined,
    CheckSquareOutlined,
    OrderedListOutlined,
} from "@ant-design/icons";

type taskT = {
    task: TaskType;
};

const TaskBar: React.FC<taskT> = ({ task }) => {
    return (
        <div className="taskBar">
            <div className="topBlock">
                <div className="nameBlock"> Name: {task.name}</div>
                <div className="buttonsBlock">
                    <Button title="Done">
                        <CheckSquareOutlined style={{ color: "#035b03" }} />
                    </Button>
                    <Button title="Working">
                        <OrderedListOutlined style={{ color: "#0707a4" }} />
                    </Button>
                    <Button title="Delete">
                        <DeleteOutlined style={{ color: "#f60606" }} />
                    </Button>
                </div>
            </div>
            <div className="descriptionBlock">
                Description: {task.description}
            </div>
        </div>
    );
};

export default TaskBar;
