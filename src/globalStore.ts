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
    editTask: (id: number, status: string) => void;
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
            console.log("Creating task:", data);

            // Ensure a new reference for Zustand's shallow equality check
            set((state) => ({
                ...state,
                isLoad: false,
                taskList: [...state.taskList, data], // ✅ New array reference
            }));

            setTimeout(() => {
                set((state) => ({
                    ...state,
                    isLoad: true,
                }));
                console.log("Updated state:", get().taskList);
            }, 2000);
        },

        editTask: (id, status) => {
            console.log("delete id", id, status);
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
