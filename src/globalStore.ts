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
                    status: "created",
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
                            taskList: [...state.taskList, data],
                            task: {
                                name: "",
                                description: "",
                                status: "created",
                            },
                        }));
                        console.log(
                            "state",
                            get().task,
                            "taskList:",
                            get().taskList
                        );
                    }, 4000);
                },

                editTask: (id) => {
                    console.log("delete id", id);
                },

                deleteTask: (id) => {
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
