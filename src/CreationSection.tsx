import React from "react";
import Form from "./Form.tsx";
import StatusBar from "./StatusBar.tsx";

const CreationSection: React.FC = () => {
    return (
        <div className="topBlock">
            <div className="creationBlock">
                <h2>Create To-DO:</h2>
                <Form />
            </div>
            <StatusBar />
        </div>
    );
};

export default CreationSection;
