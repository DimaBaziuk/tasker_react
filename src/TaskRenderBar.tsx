import React, { useState, useEffect } from "react";
import { Flex, Spin } from "antd";
import useGlobalStore from "./globalStore";

import { TaskType } from "./taskType";
import TaskList from "./TaskList";

const TaskRenderBar: React.FC = () => {
    const taskList = useGlobalStore((store) => store.taskList);
    const isLoad = useGlobalStore((store) => store.isLoad);

    const [filtered, setFiltered] = useState<{
        created: TaskType[];
        working: TaskType[];
        done: TaskType[];
    }>({
        created: [],
        working: [],
        done: [],
    });

    useEffect(() => {
        console.log("task list", taskList);
        const filteredList = {
            created: [] as TaskType[],
            working: [] as TaskType[],
            done: [] as TaskType[],
        };

        taskList.forEach((task) => {
            if (task.status === "created") {
                filteredList.created.push(task);
            } else if (task.status === "working") {
                filteredList.working.push(task);
            } else if (task.status === "done") {
                filteredList.done.push(task);
            }
        });

        setFiltered(filteredList);
    }, [taskList, isLoad]);

    return (
        <section className="taskGrid">
            {isLoad ? (
                <>
                    <TaskList dataTask={filtered.created} listName="Created" />
                    <TaskList dataTask={filtered.working} listName="Working" />
                    <TaskList dataTask={filtered.done} listName="Done" />
                </>
            ) : (
                <Flex align="center" gap="middle">
                    <Spin size="large" />
                </Flex>
            )}
        </section>
    );
};

export default TaskRenderBar;
