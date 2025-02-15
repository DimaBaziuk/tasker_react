import React, { useState, useEffect } from "react";
import useGlobalStore from "./globalStore";

import { TaskType } from "./taskType";

const TaskRenderBar: React.FC = () => {
    const taskList = useGlobalStore((store) => store.taskList);

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
    }, [taskList]);

    return <section></section>;
};

export default TaskRenderBar;
