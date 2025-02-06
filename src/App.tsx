// Create:
// 1. Form to create new todo/task.
// 2. Create 3 columns for d-n-d.
// 3. Make d-n-d for moving.
// 4. Add Zustand/IndexDB.

import React from "react";
import Form from "./Form.tsx";

const App: React.FC = () => {
    return (
        <section className="main_container">
            <div className="topBlock">
                <div className="creationBlock">
                    <h2>Create To-DO:</h2>
                    <Form />
                </div>
                <div className="statusBlock">
                    <h2>Task status:</h2>
                    <p>Created :</p>
                    <p>On work :</p>
                    <p>Done :</p>
                </div>
            </div>
        </section>
    );
};

export default App;
