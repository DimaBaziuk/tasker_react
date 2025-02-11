// Create:
// 1. Form to create new todo/task.
// 2. Create 3 columns for d-n-d.
// 3. Make d-n-d for moving.
// 4. Add Zustand/IndexDB.

import React from "react";
import CreationSection from "./CreationSection";
import TaskRenderBar from "./TaskRenderBar";

const App: React.FC = () => {
    return (
        <section className="main_container">
            <CreationSection />
            <section>
                <TaskRenderBar />
            </section>
        </section>
    );
};

export default App;
