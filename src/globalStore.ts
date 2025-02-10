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
    updateTaskValues: (fieldName: string, value: string) => void;
};

const useGlobalStore = create<GlobalStoreType>()(
    devtools(
        persist(
            (set, get) => ({
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
                    setTimeout(() => {
                        set((state) => ({
                            ...state,
                            task: { name: "", description: "" },
                        }));
                        console.log("state", get().task);
                    }, 4000);
                },
                deleteTask: (id) => {
                    console.log("delete id", id);
                },
                editTask: (id) => {
                    console.log("delete id", id);
                },
                updateTaskValues: (fieldName, values) => {
                    console.log(fieldName, values);
                    set((state) => ({ ...state, values }));
                },
            }),
            { name: "task-list-store" }
        )
    )
);

export default useGlobalStore;
