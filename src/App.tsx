// Create:
// 1. Create 3 columns for d-n-d.
// 2. Make d-n-d for moving.
// 3. Add Zustand/IndexedDB.

import React from "react";
import CreationSection from "./CreationSection";
import TaskRenderBar from "./TaskRenderBar";

const App: React.FC = () => {
    return (
        <section className="main_container">
            <CreationSection />
            <TaskRenderBar />
        </section>
    );
};

export default App;
