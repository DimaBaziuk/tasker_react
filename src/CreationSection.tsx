import React from "react";
import Form from "./Form.tsx";

const CreationSection: React.FC = () => {
    return (
        <div className="topBlock">
            <div className="creationBlock">
                <h2>Create To-DO:</h2>
                <Form />
            </div>
        </div>
    );
};

export default CreationSection;
