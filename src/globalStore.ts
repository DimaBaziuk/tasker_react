import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { TaskType } from "./taskType";

type GlobalStoreType = {
    task: TaskType;
    isLoad: boolean;
    taskList: TaskType[];
    getTask: () => void;
    createTask: (data: TaskType) => void;
    deleteTask: (id: string) => void;
    editTask: (id: string, status: string) => void;
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
                taskList: [...state.taskList, data],
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
            console.log("edited id", id, status);

            const updatedList = get().taskList.map((item) =>
                item.id === id ? { ...item, status } : item
            );

            set((state) => ({ ...state, taskList: updatedList }));
        },

        deleteTask: (id) => {
            console.log("delete id", id);
            const newList = get().taskList.filter((item) => {
                return item.id !== id;
            });

            set((state) => ({ ...state, taskList: newList }));
        },
    }))
);

export default useGlobalStore;
