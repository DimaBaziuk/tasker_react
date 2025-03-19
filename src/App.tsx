
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
