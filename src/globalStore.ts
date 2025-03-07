import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { TaskType } from "./taskType";

type GlobalStoreType = {
    task: TaskType;
    isLoad: boolean;
    taskList: TaskType[];
    getTask: () => void;
    createTask: (data: TaskType) => void;
    deleteTask: (id: number) => void;
    editTask: (id: number) => void;
    updateTaskValues: (fieldName: string, value: string) => void;
};

const useGlobalStore = create<GlobalStoreType>()(
    devtools((set, get) => ({
        task: {
            name: "",
            description: "",
            status: "created",
        },
        isLoad: true,
        taskList: [],

        getTask: () => {
            set((state) => ({ ...state }));
        },

        createTask: (data) => {
            console.log("creting task:", data);
            set((state) => ({ ...state, isLoad: false }));

            setTimeout(() => {
                set((state) => ({
                    ...state,
                    taskList: [...state.taskList, data],
                    task: {
                        name: "",
                        description: "",
                        status: "created",
                    },
                    isLoad: true,
                }));
                console.log("state", get().task, "taskList:", get().taskList);
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
    }))
);

export default useGlobalStore;
