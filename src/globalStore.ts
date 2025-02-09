import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

import { TaskType } from "./taskType";

type GlobalStoreType = {
    task: TaskType;
    taskList: TaskType[];
    getTask: () => void;
    createTask: (data: TaskType) => void;
    deleteTask: (id: number) => void;
    editTask: (id: number) => void;
};

const useGlobalStore = create<GlobalStoreType>()(
    devtools(
        persist(
            (set) => ({
                task: {
                    name: "",
                    description: "",
                },
                taskList: [],
                getTask: () => {
                    set((state) => ({ ...state }));
                },
                createTask: (data) => {
                    console.log("creting task:", data);
                },
                deleteTask: (id) => {
                    console.log("delete id", id);
                },
                editTask: (id) => {
                    console.log("delete id", id);
                },
            }),
            { name: "task-list-store" }
        )
    )
);

export default useGlobalStore;
