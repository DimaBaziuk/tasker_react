import React from "react";
import { Button } from "antd";
import useGlobalStore from "./globalStore";

import {
    DeleteOutlined,
    CheckSquareOutlined,
    OrderedListOutlined,
    UndoOutlined,
} from "@ant-design/icons";

const TaskBarButtons: React.FC<{ taskId: string; taskStatus: string }> = ({
    taskId,
    taskStatus,
}) => {
    const deleteTask = useGlobalStore((store) => store.deleteTask);
    const editTask = useGlobalStore((store) => store.editTask);

    return (
        <div className="buttonsBlock">
            {taskStatus === "done" ? (
                <>
                    <Button
                        title="Undone"
                        onClick={() => editTask(taskId, "created")}
                    >
                        <UndoOutlined style={{ color: "#035b03" }} />
                    </Button>

                    <Button
                        title="Working"
                        onClick={() => editTask(taskId, "working")}
                    >
                        <OrderedListOutlined style={{ color: "#0707a4" }} />
                    </Button>
                </>
            ) : taskStatus === "working" ? (
                <>
                    <Button
                        title="Done"
                        onClick={() => editTask(taskId, "done")}
                    >
                        <CheckSquareOutlined style={{ color: "#035b03" }} />
                    </Button>
                    <Button
                        title="Undone"
                        onClick={() => editTask(taskId, "created")}
                    >
                        <UndoOutlined style={{ color: "#035b03" }} />
                    </Button>
                </>
            ) : (
                <>
                    <Button
                        title="Done"
                        onClick={() => editTask(taskId, "done")}
                    >
                        <CheckSquareOutlined style={{ color: "#035b03" }} />
                    </Button>
                    <Button
                        title="Working"
                        onClick={() => editTask(taskId, "working")}
                    >
                        <OrderedListOutlined style={{ color: "#0707a4" }} />
                    </Button>
                </>
            )}

            <Button title="Delete" onClick={() => deleteTask(taskId)}>
                <DeleteOutlined style={{ color: "#f60606" }} />
            </Button>
        </div>
    );
};

export default TaskBarButtons;
